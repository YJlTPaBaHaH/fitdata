from datetime import datetime, timedelta


RU_MONTHS = {
    1: "января",
    2: "февраля",
    3: "марта",
    4: "апреля",
    5: "мая",
    6: "июня",
    7: "июля",
    8: "августа",
    9: "сентября",
    10: "октября",
    11: "ноября",
    12: "декабря",
}


def parse_date(date_value: str):
    return datetime.strptime(date_value, "%Y-%m-%d").date()


def format_date_ru(date_value: str) -> str:
    parsed_date = parse_date(date_value)
    return f"{parsed_date.day} {RU_MONTHS[parsed_date.month]} {parsed_date.year}"


def calculate_temporal_training_frequency_7d(
    workouts: list[dict],
    selected_date: str,
) -> int:
    """
    Считает количество тренировок за 7 дней относительно выбранной даты.
    """

    selected_day = parse_date(selected_date)
    period_start = selected_day - timedelta(days=7)

    return sum(
        1
        for workout in workouts
        if period_start <= parse_date(workout["date"]) <= selected_day
    )


def build_display_metrics(
    temporal_status: dict,
    features: dict | None = None,
    last_workout_date: str | None = None,
) -> list[dict]:
    """
    Формирует метрики для отображения на frontend.
    В день тренировки показывает метрики выбранной тренировки.
    В дни без тренировки показывает контекст восстановления.
    """

    status = temporal_status.get("status")

    if features is None:
        features = {}

    if status == "training_day":
        return [
            {
                "label": "Следующий объем",
                "value": f'{features.get("predicted_next_volume", 0)} кг',
            },
            {
                "label": "Текущий объем",
                "value": f'{features.get("total_volume", 0)} кг',
            },
            {
                "label": "Упражнения",
                "value": str(features.get("exercise_count", 0)),
            },
            {
                "label": "Подходы",
                "value": str(features.get("sets_count", 0)),
            },
            {
                "label": "Частота за 7 дней",
                "value": str(features.get("training_frequency_7d", 0)),
            },
            {
                "label": "Средний 1RM",
                "value": f'{features.get("avg_1rm", 0)} кг',
            },
        ]

    if status == "no_data":
        return [
            {
                "label": "Статус",
                "value": "Нет тренировочных данных",
            }
        ]

    return [
        {
            "label": "Последняя тренировка",
            "value": format_date_ru(last_workout_date) if last_workout_date else "Не определена",
        },
        {
            "label": "Дней после тренировки",
            "value": str(temporal_status.get("days_since_last_workout", 0)),
        },
        {
            "label": "Объем последней тренировки",
            "value": f'{features.get("total_volume", 0)} кг',
        },
        {
            "label": "Частота за 7 дней",
            "value": str(features.get("training_frequency_7d", 0)),
        },
        {
            "label": "Следующий объем",
            "value": f'{features.get("predicted_next_volume", 0)} кг',
        },
    ]


def build_temporal_state(load_class: int, workout_date: str, selected_date: str) -> dict:
    """
    Определяет временное состояние пользователя относительно выбранной даты.

    Важно:
    temporal.py не формирует текстовые рекомендации.
    За текст отвечает recommender.py.
    """

    workout_day = parse_date(workout_date)
    selected_day = parse_date(selected_date)

    days_since_last_workout = (selected_day - workout_day).days

    if days_since_last_workout < 0:
        return {
            "status": "no_data",
            "status_label": "Нет данных",
            "days_since_last_workout": None,
        }

    if days_since_last_workout == 0:
        return {
            "status": "training_day",
            "status_label": "День тренировки",
            "days_since_last_workout": 0,
        }

    if load_class == 2 and days_since_last_workout == 1:
        return {
            "status": "recovery",
            "status_label": "Восстановление",
            "days_since_last_workout": days_since_last_workout,
        }

    if load_class == 2 and days_since_last_workout >= 2:
        return {
            "status": "ready",
            "status_label": "Готовность к нагрузке",
            "days_since_last_workout": days_since_last_workout,
        }

    if load_class == 1 and days_since_last_workout <= 2:
        return {
            "status": "ready",
            "status_label": "Готовность к нагрузке",
            "days_since_last_workout": days_since_last_workout,
        }

    if load_class == 0 and days_since_last_workout >= 3:
        return {
            "status": "underload",
            "status_label": "Снижение тренировочной активности",
            "days_since_last_workout": days_since_last_workout,
        }

    return {
        "status": "ready",
        "status_label": "Нейтральное состояние",
        "days_since_last_workout": days_since_last_workout,
    }