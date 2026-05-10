from pathlib import Path
from functools import lru_cache

import pandas as pd
from flask import Blueprint, jsonify, request

from database import get_connection
from ml.features import build_features_from_history
from ml.model import (
    load_model,
    predict_load_class,
    predict_load_probabilities,
    predict_next_volume,
)
from ml.recommender import generate_recommendation, get_load_status


ml_routes = Blueprint("ml_routes", __name__)

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / "ml"

LOAD_CLASSIFIER_PATH = ML_DIR / "load_classifier.joblib"
VOLUME_REGRESSOR_PATH = ML_DIR / "volume_regressor.joblib"


@lru_cache(maxsize=1)
def get_models():
    if not LOAD_CLASSIFIER_PATH.exists():
        raise FileNotFoundError("Файл load_classifier.joblib не найден")

    if not VOLUME_REGRESSOR_PATH.exists():
        raise FileNotFoundError("Файл volume_regressor.joblib не найден")

    return (
        load_model(LOAD_CLASSIFIER_PATH),
        load_model(VOLUME_REGRESSOR_PATH),
    )


def interpret_model_confidence(load_probabilities: dict) -> dict:
    sorted_probabilities = sorted(
        load_probabilities.items(),
        key=lambda item: float(item[1]),
        reverse=True,
    )

    top_class, top_probability = sorted_probabilities[0]
    second_class, second_probability = sorted_probabilities[1]

    top_probability = float(top_probability)
    second_probability = float(second_probability)
    margin = top_probability - second_probability

    if top_probability >= 0.75 and margin >= 0.30:
        level = "high"
        label = "Высокая уверенность"
        text = "Модель уверенно определила класс тренировочной нагрузки."
    elif top_probability >= 0.55 and margin >= 0.15:
        level = "medium"
        label = "Средняя уверенность"
        text = (
            "Модель определила основной класс нагрузки, однако результат имеет "
            "среднюю степень уверенности. Рекомендуется учитывать дополнительные "
            "показатели тренировочной динамики."
        )
    else:
        level = "low"
        label = "Пограничный результат"
        text = (
            "Результат классификации является пограничным. Рекомендуется "
            "интерпретировать его совместно с динамикой объема, частотой тренировок "
            "и историей предыдущих занятий."
        )

    return {
        "level": level,
        "label": label,
        "top_class": str(top_class),
        "top_probability": round(top_probability, 4),
        "second_class": str(second_class),
        "second_probability": round(second_probability, 4),
        "margin": round(margin, 4),
        "text": text,
    }


def build_user_workout_history(user_id: int) -> dict:
    with get_connection() as connection:
        user = connection.execute(
            """
            SELECT user_id
            FROM users
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

        if user is None:
            raise ValueError("Пользователь не найден")

        rows = connection.execute(
            """
            SELECT
                w.workout_id,
                w.user_id,
                w.date,
                we.workout_exercise_id,
                we.exercise_id,
                e.name,
                s.set_id,
                s.set_number,
                s.weight,
                s.reps
            FROM workouts w
            JOIN workout_exercises we ON we.workout_id = w.workout_id
            JOIN exercises e ON e.exercise_id = we.exercise_id
            JOIN sets s ON s.workout_exercise_id = we.workout_exercise_id
            WHERE w.user_id = ?
            ORDER BY w.date ASC, w.workout_id ASC, we.order_index ASC, s.set_number ASC
            """,
            (user_id,),
        ).fetchall()

    if not rows:
        return {
            "user_id": user_id,
            "workouts": [],
        }

    workouts_map = {}

    for row in rows:
        workout_id = row["workout_id"]

        if workout_id not in workouts_map:
            workouts_map[workout_id] = {
                "workout_id": row["workout_id"],
                "user_id": row["user_id"],
                "date": row["date"],
                "exercises": {},
            }

        exercise_key = row["exercise_id"]

        if exercise_key not in workouts_map[workout_id]["exercises"]:
            workouts_map[workout_id]["exercises"][exercise_key] = {
                "workout_exercise_id": row["workout_exercise_id"],
                "exercise_id": row["exercise_id"],
                "name": row["name"],
                "sets": [],
            }

        workouts_map[workout_id]["exercises"][exercise_key]["sets"].append(
            {
                "set_id": row["set_id"],
                "set_number": row["set_number"],
                "weight": row["weight"],
                "reps": row["reps"],
            }
        )

    workouts = []

    for workout in workouts_map.values():
        workout["exercises"] = list(workout["exercises"].values())
        workouts.append(workout)

    return {
        "user_id": user_id,
        "workouts": workouts,
    }


def build_prediction_result(features_row: pd.DataFrame) -> dict:
    load_classifier, volume_regressor = get_models()

    load_class = predict_load_class(load_classifier, features_row)
    load_status = get_load_status(load_class)

    load_probabilities = predict_load_probabilities(load_classifier, features_row)
    confidence = interpret_model_confidence(load_probabilities)

    predicted_next_volume = predict_next_volume(volume_regressor, features_row)
    predicted_next_volume = max(0.0, float(predicted_next_volume))

    latest_row = features_row.iloc[0]

    recommendation = generate_recommendation(
        load_class=load_class,
        total_volume=float(latest_row["total_volume"]),
        volume_trend=float(latest_row["volume_trend"]),
        training_frequency_7d=int(latest_row["training_frequency_7d"]),
        predicted_next_volume=predicted_next_volume,
    )

    return {
        "user_id": int(latest_row["user_id"]),
        "workout_id": int(latest_row["workout_id"]),
        "date": latest_row["date"],
        "load_class": load_class,
        "load_status": load_status,
        "load_probabilities": load_probabilities,
        "confidence": confidence,
        "recommendation": recommendation,
        "features": {
            "total_volume": round(float(latest_row["total_volume"]), 2),
            "sets_count": int(latest_row["sets_count"]),
            "avg_weight": round(float(latest_row["avg_weight"]), 2),
            "max_weight": round(float(latest_row["max_weight"]), 2),
            "avg_reps": round(float(latest_row["avg_reps"]), 2),
            "avg_1rm": round(float(latest_row["avg_1rm"]), 2),
            "max_1rm": round(float(latest_row["max_1rm"]), 2),
            "exercise_count": int(latest_row["exercise_count"]),
            "days_since_previous_workout": int(latest_row["days_since_previous_workout"]),
            "volume_change": round(float(latest_row["volume_change"]), 4),
            "rolling_volume_mean": round(float(latest_row["rolling_volume_mean"]), 2),
            "volume_trend": round(float(latest_row["volume_trend"]), 4),
            "training_frequency_7d": int(latest_row["training_frequency_7d"]),
        },
        "prediction": {
            "predicted_next_volume": round(float(predicted_next_volume), 2),
        },
    }


@ml_routes.route("/api/ml/recommendation", methods=["GET"])
def get_ml_recommendation():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({"error": "Необходимо указать user_id"}), 400

    try:
        workout_history = build_user_workout_history(user_id)

        if not workout_history["workouts"]:
            return jsonify({"error": "У пользователя пока нет тренировок"}), 404

        features_df = build_features_from_history(workout_history)

        if features_df.empty:
            return jsonify({"error": "Недостаточно данных для расчета признаков"}), 422

        latest_features = features_df.sort_values("date").tail(1)
        result = build_prediction_result(latest_features)

        return jsonify(result)

    except ValueError as error:
        return jsonify({"error": str(error)}), 404

    except FileNotFoundError as error:
        return jsonify({"error": str(error)}), 500

    except Exception as error:
        return jsonify({
            "error": "Ошибка расчета ML-рекомендации",
            "details": str(error),
        }), 500