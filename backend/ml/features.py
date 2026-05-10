from __future__ import annotations

from typing import Any

import pandas as pd


def calculate_set_volume(weight: float, reps: int) -> float:
    """Рассчитывает объем одного подхода."""
    return float(weight) * int(reps)


def calculate_epley_1rm(weight: float, reps: int) -> float:
    """Рассчитывает примерный одноповторный максимум по формуле Эпли."""
    return float(weight) * (1 + int(reps) / 30)


def build_features_from_history(workout_history: dict[str, Any]) -> pd.DataFrame:
    """
    Преобразует JSON истории тренировок в таблицу признаков.
    Одна строка итоговой таблицы соответствует одной тренировке.
    """

    workouts = workout_history.get("workouts", [])
    rows: list[dict[str, Any]] = []

    for index, workout in enumerate(workouts):
        user_id = workout.get("user_id", workout_history.get("user_id"))
        workout_id = workout.get("workout_id", index + 1)
        workout_date = workout.get("date")

        set_volumes = []
        weights = []
        reps_values = []
        one_rep_max_values = []

        exercises = workout.get("exercises", [])

        for exercise in exercises:
            for workout_set in exercise.get("sets", []):
                weight = float(workout_set.get("weight", 0) or 0)
                reps = int(workout_set.get("reps", 0) or 0)

                if weight <= 0 or reps <= 0:
                    continue

                set_volumes.append(calculate_set_volume(weight, reps))
                weights.append(weight)
                reps_values.append(reps)
                one_rep_max_values.append(calculate_epley_1rm(weight, reps))

        if not set_volumes:
            continue

        rows.append(
            {
                "user_id": user_id,
                "workout_id": workout_id,
                "date": workout_date,
                "total_volume": sum(set_volumes),
                "sets_count": len(set_volumes),
                "avg_weight": sum(weights) / len(weights),
                "max_weight": max(weights),
                "avg_reps": sum(reps_values) / len(reps_values),
                "avg_1rm": sum(one_rep_max_values) / len(one_rep_max_values),
                "max_1rm": max(one_rep_max_values),
                "exercise_count": len(exercises),
            }
        )

    features_df = pd.DataFrame(rows)

    if features_df.empty:
        return features_df

    features_df["date"] = pd.to_datetime(features_df["date"], errors="coerce")
    features_df = features_df.dropna(subset=["date"])
    features_df = features_df.sort_values(["user_id", "date"]).reset_index(drop=True)

    features_df["days_since_previous_workout"] = (
        features_df.groupby("user_id")["date"].diff().dt.days.fillna(7)
    )

    features_df["volume_change"] = (
        features_df.groupby("user_id")["total_volume"]
        .pct_change()
        .replace([float("inf"), -float("inf")], 0)
        .fillna(0)
    )

    features_df["rolling_volume_mean"] = (
        features_df.groupby("user_id")["total_volume"]
        .rolling(window=3, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )

    features_df["volume_trend"] = (
        (features_df["total_volume"] - features_df["rolling_volume_mean"])
        / features_df["rolling_volume_mean"]
    ).replace([float("inf"), -float("inf")], 0).fillna(0)

    features_df["training_frequency_7d"] = features_df.apply(
        lambda row: _calculate_training_frequency_7d(features_df, row),
        axis=1,
    )

    features_df["date"] = features_df["date"].dt.strftime("%Y-%m-%d")

    return features_df


def _calculate_training_frequency_7d(
    features_df: pd.DataFrame,
    row: pd.Series,
) -> int:
    """Считает количество тренировок пользователя за последние 7 дней."""

    current_date = row["date"]
    period_start = current_date - pd.Timedelta(days=7)

    user_workouts = features_df[
        (features_df["user_id"] == row["user_id"])
        & (features_df["date"] >= period_start)
        & (features_df["date"] <= current_date)
    ]

    return int(len(user_workouts))


def get_ml_feature_columns() -> list[str]:
    """Возвращает признаки, которые подаются в ML-модели."""

    return [
        "total_volume",
        "sets_count",
        "avg_weight",
        "max_weight",
        "avg_reps",
        "avg_1rm",
        "max_1rm",
        "exercise_count",
        "days_since_previous_workout",
        "volume_change",
        "rolling_volume_mean",
        "volume_trend",
        "training_frequency_7d",
    ]


def prepare_features_for_model(features_df: pd.DataFrame) -> pd.DataFrame:
    """Оставляет только признаки для обучения или предсказания."""

    return features_df[get_ml_feature_columns()].copy()