from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml.features import get_ml_feature_columns


def create_expert_target(features_df: pd.DataFrame) -> pd.DataFrame:
    """
    Формирует целевую переменную на основе экспертной скоринговой оценки.

    0 — недостаточная нагрузка
    1 — оптимальная нагрузка
    2 — высокая нагрузка / признаки возможной перегрузки

    Target не является медицинской диагностикой.
    Он отражает аналитическую оценку тренировочной нагрузки по данным дневника.
    """

    df = features_df.copy()

    def classify(row: pd.Series) -> int:
        overload_score = 0
        low_load_score = 0

        # Признаки возможной высокой нагрузки
        if row["training_frequency_7d"] >= 6:
            overload_score += 2
        elif row["training_frequency_7d"] == 5:
            overload_score += 1

        if row["volume_change"] > 0.60:
            overload_score += 2
        elif row["volume_change"] > 0.35:
            overload_score += 1

        if row["volume_trend"] > 0.45:
            overload_score += 2
        elif row["volume_trend"] > 0.25:
            overload_score += 1

        if row["days_since_previous_workout"] == 0:
            overload_score += 2
        elif (
            row["days_since_previous_workout"] == 1
            and row["training_frequency_7d"] >= 5
        ):
            overload_score += 1

        if row["sets_count"] >= 28:
            overload_score += 1

        # Признаки недостаточной нагрузки
        if row["training_frequency_7d"] <= 1:
            low_load_score += 2
        elif row["training_frequency_7d"] == 2:
            low_load_score += 1

        if row["sets_count"] <= 5:
            low_load_score += 2
        elif row["sets_count"] <= 8:
            low_load_score += 1

        if row["volume_trend"] < -0.45:
            low_load_score += 2
        elif row["volume_trend"] < -0.25:
            low_load_score += 1

        if row["volume_change"] < -0.50:
            low_load_score += 1

        if row["days_since_previous_workout"] >= 6:
            low_load_score += 1

        if overload_score >= 3 and overload_score > low_load_score:
            return 2

        if low_load_score >= 3 and low_load_score > overload_score:
            return 0

        return 1

    df["target"] = df.apply(classify, axis=1)

    return df


def add_regression_target(features_df: pd.DataFrame) -> pd.DataFrame:
    """
    Добавляет целевую переменную для регрессии:
    прогноз суммарного объема следующей тренировки пользователя.
    """

    df = features_df.copy()
    df = df.sort_values(["user_id", "date"]).reset_index(drop=True)

    df["next_total_volume"] = df.groupby("user_id")["total_volume"].shift(-1)
    df = df.dropna(subset=["next_total_volume"]).reset_index(drop=True)

    return df


def create_classifier_pipeline() -> Pipeline:
    """
    Создает полный pipeline классификации:
    нормализация признаков + Gradient Boosting Classifier.
    """

    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                GradientBoostingClassifier(
                    n_estimators=150,
                    learning_rate=0.05,
                    max_depth=3,
                    random_state=42,
                ),
            ),
        ]
    )


def create_regressor_pipeline() -> Pipeline:
    """
    Создает полный pipeline регрессии:
    нормализация признаков + Linear Regression.
    """

    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("regressor", LinearRegression()),
        ]
    )


def train_load_classifier(
    features_df: pd.DataFrame,
    model_path: str | Path = "load_classifier.joblib",
) -> dict[str, Any]:
    """
    Обучает модель классификации тренировочной нагрузки.

    Дополнительно выполняет:
    - baseline-сравнение с DummyClassifier;
    - кросс-валидацию;
    - расчет важности признаков;
    - сохранение полного ML pipeline.
    """

    df = create_expert_target(features_df)
    feature_columns = get_ml_feature_columns()

    X = df[feature_columns]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    baseline_model = DummyClassifier(strategy="most_frequent")
    baseline_model.fit(X_train, y_train)
    baseline_pred = baseline_model.predict(X_test)

    model = create_classifier_pipeline()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_f1_scores = cross_val_score(
        model,
        X,
        y,
        cv=cv,
        scoring="f1_macro",
    )

    classifier = model.named_steps["classifier"]

    feature_importance = dict(
        sorted(
            zip(feature_columns, classifier.feature_importances_),
            key=lambda item: item[1],
            reverse=True,
        )
    )

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "f1_macro": f1_score(y_test, y_pred, average="macro"),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "class_distribution": df["target"].value_counts().sort_index().to_dict(),
        "baseline_accuracy": accuracy_score(y_test, baseline_pred),
        "baseline_f1_macro": f1_score(y_test, baseline_pred, average="macro"),
        "cv_f1_macro_mean": float(cv_f1_scores.mean()),
        "cv_f1_macro_std": float(cv_f1_scores.std()),
        "feature_importance": feature_importance,
    }

    joblib.dump(model, model_path)

    return {
        "model": model,
        "metrics": metrics,
    }


def train_volume_regressor(
    features_df: pd.DataFrame,
    model_path: str | Path = "volume_regressor.joblib",
) -> dict[str, Any]:
    """
    Обучает модель регрессии для прогноза объема следующей тренировки.

    Сохраняется полный pipeline:
    нормализация признаков + Linear Regression.
    """

    df = add_regression_target(features_df)
    feature_columns = get_ml_feature_columns()

    X = df[feature_columns]
    y = df["next_total_volume"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
    )

    model = create_regressor_pipeline()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    metrics = {
        "mae": mean_absolute_error(y_test, y_pred),
        "mse": mean_squared_error(y_test, y_pred),
        "r2": r2_score(y_test, y_pred),
    }

    joblib.dump(model, model_path)

    return {
        "model": model,
        "metrics": metrics,
    }


def load_model(model_path: str | Path):
    """
    Загружает сохраненный ML pipeline.
    """

    return joblib.load(model_path)


def predict_load_class(model, features_row: pd.DataFrame) -> int:
    """
    Предсказывает класс тренировочной нагрузки.
    """

    feature_columns = get_ml_feature_columns()
    prediction = model.predict(features_row[feature_columns])

    return int(prediction[0])


def predict_load_probabilities(model, features_row: pd.DataFrame) -> dict[int, float]:
    """
    Возвращает вероятности принадлежности к каждому классу нагрузки.
    """

    feature_columns = get_ml_feature_columns()

    if not hasattr(model, "predict_proba"):
        return {}

    probabilities = model.predict_proba(features_row[feature_columns])[0]
    classes = model.classes_

    return {
        int(load_class): round(float(probability), 4)
        for load_class, probability in zip(classes, probabilities)
    }


def predict_next_volume(model, features_row: pd.DataFrame) -> float:
    """
    Прогнозирует объем следующей тренировки.
    """

    feature_columns = get_ml_feature_columns()
    prediction = model.predict(features_row[feature_columns])

    return float(prediction[0])
def postprocess_next_volume_prediction(
    raw_predicted_volume: float,
    current_volume: float,
    max_change_ratio: float = 0.35,
) -> dict:
    """
    Ограничивает прогноз следующего тренировочного объема
    безопасным диапазоном относительно текущего объема.

    Модель сохраняется как источник прогноза, но итоговое значение
    проходит постобработку для повышения интерпретируемости.
    """

    raw_value = float(raw_predicted_volume)

    if current_volume <= 0:
        safe_value = max(0.0, raw_value)

        return {
            "raw_predicted_next_volume": round(raw_value, 2),
            "predicted_next_volume": round(safe_value, 2),
            "prediction_was_clipped": raw_value != safe_value,
            "min_allowed_volume": 0.0,
            "max_allowed_volume": None,
        }

    min_allowed = current_volume * (1 - max_change_ratio)
    max_allowed = current_volume * (1 + max_change_ratio)

    clipped_value = min(max(raw_value, min_allowed), max_allowed)
    clipped_value = max(0.0, clipped_value)

    return {
        "raw_predicted_next_volume": round(raw_value, 2),
        "predicted_next_volume": round(clipped_value, 2),
        "prediction_was_clipped": raw_value != clipped_value,
        "min_allowed_volume": round(min_allowed, 2),
        "max_allowed_volume": round(max_allowed, 2),
    }