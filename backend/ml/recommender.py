from __future__ import annotations


LOAD_STATUS = {
    0: "Недостаточная нагрузка",
    1: "Оптимальная нагрузка",
    2: "Высокая нагрузка / риск перегрузки",
}


TEMPORAL_STATUS = {
    "training_day": "День тренировки",
    "recovery": "Восстановление",
    "ready": "Готовность к нагрузке",
    "underload": "Снижение тренировочной активности",
    "no_data": "Нет данных",
}


def get_load_status(load_class: int) -> str:
    """Возвращает текстовый статус нагрузки по классу."""
    return LOAD_STATUS.get(load_class, "Неизвестный класс нагрузки")


def get_temporal_status_label(status: str) -> str:
    """Возвращает текстовый статус состояния пользователя во времени."""
    return TEMPORAL_STATUS.get(status, "Неизвестное состояние")


def generate_recommendation(
    load_class: int,
    total_volume: float,
    volume_trend: float,
    training_frequency_7d: int,
    predicted_next_volume: float | None = None,
) -> str:
    """
    Формирует рекомендацию по факту выполненной тренировки.
    Используется в день тренировки, когда есть новые тренировочные данные.
    """

    recommendation = _get_base_recommendation(load_class, training_frequency_7d)
    recommendation += _get_prediction_comment(
        load_class=load_class,
        total_volume=total_volume,
        predicted_next_volume=predicted_next_volume,
    )
    recommendation += _get_volume_trend_comment(
        load_class=load_class,
        volume_trend=volume_trend,
    )
    recommendation += _get_frequency_comment(
        load_class=load_class,
        training_frequency_7d=training_frequency_7d,
    )

    return recommendation


def generate_temporal_recommendation(
    status: str,
    last_load_class: int | None = None,
    days_since_last_workout: int | None = None,
) -> str:
    """
    Формирует рекомендацию для выбранной даты с учетом времени,
    прошедшего после последней тренировки.
    """

    if status == "no_data":
        return (
            "На выбранную дату отсутствуют тренировочные данные для анализа. "
            "Рекомендуется добавить первую тренировку, чтобы система смогла рассчитать "
            "нагрузку и сформировать персональные рекомендации."
        )

    if status == "training_day":
        if last_load_class == 0:
            return (
                "На выбранную дату зафиксирована тренировка с недостаточной нагрузкой. "
                "Рекомендуется постепенно повысить регулярность занятий или увеличить "
                "тренировочный объем без резких скачков."
            )

        if last_load_class == 1:
            return (
                "На выбранную дату зафиксирована тренировка с оптимальной нагрузкой. "
                "Рекомендуется сохранить текущий режим и продолжить отслеживание "
                "динамики рабочих весов и тренировочного объема."
            )

        if last_load_class == 2:
            return (
                "На выбранную дату зафиксирована высокая тренировочная нагрузка. "
                "Рекомендуется снизить объем следующей тренировки и предусмотреть "
                "период восстановления."
            )

        return (
            "На выбранную дату зафиксирована тренировка, однако класс нагрузки "
            "не удалось определить. Рекомендуется проверить полноту внесенных данных."
        )

    if status == "recovery":
        return (
            "После предыдущей тренировки организм находится в фазе восстановления. "
            "Рекомендуется воздержаться от высокой нагрузки, уделить внимание отдыху "
            "и вернуться к тренировочному процессу после завершения восстановительного периода."
        )

    if status == "ready":
        if days_since_last_workout is not None and days_since_last_workout >= 2:
            return (
                "Восстановительный период после последней тренировки завершен. "
                "Пользователь готов к следующей тренировке. Рекомендуется начинать "
                "занятие с умеренной нагрузки и контролировать дальнейший рост объема."
            )

        return (
            "Критических признаков перегрузки не выявлено. Пользователь готов "
            "к следующей тренировке при условии сохранения умеренного темпа повышения нагрузки."
        )

    if status == "underload":
        return (
            "После последней тренировки прошло несколько дней, что может указывать "
            "на снижение регулярности тренировочного процесса. Рекомендуется вернуться "
            "к плановым занятиям и постепенно восстановить тренировочный объем."
        )

    return (
        "Состояние пользователя на выбранную дату не удалось интерпретировать. "
        "Рекомендуется продолжить ведение тренировочного дневника для накопления данных."
    )


def _get_base_recommendation(load_class: int, training_frequency_7d: int) -> str:
    """Формирует базовую рекомендацию по классу нагрузки."""

    if load_class == 0:
        if training_frequency_7d >= 5:
            return (
                "Текущая тренировочная нагрузка оценивается как недостаточная по объему "
                "и динамике прогресса, несмотря на высокую частоту тренировок. "
                "Рекомендуется не увеличивать количество тренировочных дней, а пересмотреть "
                "структуру занятий: постепенно повысить рабочий объем, количество эффективных "
                "подходов или качество выполнения упражнений."
            )

        return (
            "Текущая тренировочная нагрузка оценивается как недостаточная. "
            "Рекомендуется повысить регулярность тренировок или постепенно увеличить "
            "общий тренировочный объем. Увеличение нагрузки следует выполнять плавно, "
            "без резких скачков объема."
        )

    if load_class == 1:
        return (
            "Текущий тренировочный режим оценивается как сбалансированный. "
            "Рекомендуется сохранить текущую регулярность тренировок, продолжить "
            "отслеживание динамики объема и рабочих весов, а также избегать резкого "
            "увеличения нагрузки."
        )

    if load_class == 2:
        return (
            "В тренировочном процессе выявлены признаки повышенной нагрузки. "
            "Рекомендуется снизить общий тренировочный объем, увеличить период "
            "восстановления между тренировками и избегать дальнейшего резкого роста "
            "рабочих весов или количества подходов."
        )

    return (
        "Не удалось определить состояние тренировочной нагрузки. "
        "Рекомендуется продолжить ведение тренировочного дневника для накопления "
        "достаточного объема данных."
    )


def _get_prediction_comment(
    load_class: int,
    total_volume: float,
    predicted_next_volume: float | None,
) -> str:
    """Формирует комментарий по прогнозу следующего тренировочного объема."""

    if predicted_next_volume is None or total_volume <= 0:
        return ""

    if predicted_next_volume <= 0:
        return (
            " Регрессионная модель прогнозирует снижение тренировочного объема. "
            "Так как тренировочный объем не может быть отрицательной величиной, "
            "результат прогноза ограничен нулевым значением. Рекомендуется проверить "
            "полноту внесенных данных и структуру последней тренировки."
        )

    volume_difference = predicted_next_volume - total_volume
    volume_difference_percent = volume_difference / total_volume * 100

    if volume_difference_percent > 15:
        if load_class == 2:
            return (
                f" Прогноз указывает на возможный рост объема следующей тренировки "
                f"примерно на {volume_difference_percent:.1f}%. При уже повышенной "
                f"нагрузке такой рост нежелателен, поэтому рекомендуется ограничить "
                f"увеличение объема."
            )

        return (
            f" Прогноз указывает на возможный рост объема следующей тренировки "
            f"примерно на {volume_difference_percent:.1f}%. Рекомендуется контролировать "
            f"темп увеличения нагрузки."
        )

    if volume_difference_percent < -15:
        if load_class == 0:
            return (
                f" Прогноз указывает на возможное снижение объема следующей тренировки "
                f"примерно на {abs(volume_difference_percent):.1f}%. При недостаточной "
                f"нагрузке рекомендуется проверить регулярность и структуру занятий."
            )

        if load_class == 2:
            return (
                f" Прогноз указывает на возможное снижение объема следующей тренировки "
                f"примерно на {abs(volume_difference_percent):.1f}%. В условиях повышенной "
                f"нагрузки такое снижение может быть допустимым как элемент восстановления."
            )

        return (
            f" Прогноз указывает на возможное снижение объема следующей тренировки "
            f"примерно на {abs(volume_difference_percent):.1f}%. Рекомендуется проверить, "
            f"является ли снижение плановым элементом тренировочного процесса."
        )

    return (
        " Прогноз следующей тренировки не показывает резкого изменения объема, "
        "что соответствует стабильной динамике тренировочного процесса."
    )


def _get_volume_trend_comment(load_class: int, volume_trend: float) -> str:
    """Формирует комментарий по тренду тренировочного объема."""

    if volume_trend > 0.35:
        if load_class == 2:
            return (
                " Дополнительно зафиксирован резкий положительный тренд тренировочного "
                "объема, поэтому дальнейшее увеличение нагрузки следует ограничить."
            )

        return (
            " Дополнительно зафиксирован выраженный рост тренировочного объема. "
            "Рекомендуется контролировать, чтобы увеличение нагрузки оставалось постепенным."
        )

    if volume_trend < -0.35:
        if load_class == 0:
            return (
                " Также зафиксировано выраженное снижение тренировочного объема относительно "
                "недавних тренировок. Рекомендуется проверить, не связано ли это с пропусками, "
                "снижением рабочих весов или уменьшением количества подходов."
            )

        return (
            " Также наблюдается снижение тренировочного объема относительно недавнего уровня. "
            "Рекомендуется отслеживать, является ли это плановым восстановительным периодом."
        )

    return ""


def _get_frequency_comment(load_class: int, training_frequency_7d: int) -> str:
    """Формирует комментарий по частоте тренировок."""

    if training_frequency_7d >= 5:
        if load_class == 0:
            return (
                " При этом частота тренировок за последние 7 дней высокая, поэтому повышать "
                "нагрузку следует не за счет дополнительных тренировочных дней, а за счет "
                "более качественного распределения объема внутри занятий."
            )

        if load_class == 1:
            return (
                " Частота тренировок за последние 7 дней высокая, однако общий режим пока "
                "оценивается как сбалансированный. Рекомендуется контролировать восстановление."
            )

        if load_class == 2:
            return (
                " Частота тренировок за последние 7 дней является высокой, поэтому необходимо "
                "уделить внимание восстановлению."
            )

    if training_frequency_7d <= 1 and load_class == 0:
        return (
            " Частота тренировок за последние 7 дней низкая, поэтому первоочередной мерой "
            "является повышение регулярности занятий."
        )

    return ""
TRAINING_LEVEL_LABELS = {
    "beginner": "Новичок",
    "amateur": "Любитель",
    "advanced": "Продвинутый",
}

TRAINING_GOAL_LABELS = {
    "muscle_gain": "Набор мышечной массы",
    "strength": "Развитие силы",
    "maintenance": "Поддержание формы",
    "general_fitness": "Общий фитнес",
}

LIMITATION_LABELS = {
    "back": "Спина",
    "knees": "Колени",
    "cardio": "Сердечно-сосудистые ограничения",
    "blood_pressure": "Давление",
    "injuries": "Травмы",
    "other": "Другое",
}

STRICT_LIMITATIONS = {"cardio", "blood_pressure", "injuries"}

LEVEL_MAX_INCREASE_RATIO = {
    "beginner": 0.12,
    "amateur": 0.22,
    "advanced": 0.32,
}


def apply_profile_safety_layer(
    recommendation: str,
    prediction_data: dict | None,
    user_profile: dict | None,
) -> dict:
    """
    Выполняет осторожную персонализацию финальной рекомендации на основе профиля.

    Важно:
    — функция не изменяет исходный класс ML-модели;
    — функция не подменяет прогноз модели;
    — функция формирует отдельное значение suggested_next_volume;
    — функция добавляет предупреждения и уточняющий текст рекомендации.
    """

    if not user_profile:
        return {
            "recommendation": recommendation,
            "suggested_next_volume": _get_predicted_volume(prediction_data),
            "profile_warnings": [],
            "profile_safety": {
                "is_applied": False,
                "risk_level": "none",
                "applied_rules": [],
            },
        }

    training_level = user_profile.get("training_level") or ""
    training_goal = user_profile.get("training_goal") or ""
    limitations = user_profile.get("health_limitations") or []
    disclaimer_accepted = bool(user_profile.get("disclaimer_accepted"))

    if not isinstance(limitations, list):
        limitations = []

    load_class = _get_load_class(prediction_data)
    current_volume = _get_current_volume(prediction_data)
    predicted_next_volume = _get_predicted_volume(prediction_data)

    applied_rules = []
    profile_comments = []
    profile_warnings = []

    risk_level = "low"
    has_limitations = len(limitations) > 0
    has_strict_limitations = any(
        limitation in STRICT_LIMITATIONS
        for limitation in limitations
    )

    max_increase_ratio = LEVEL_MAX_INCREASE_RATIO.get(training_level, 0.20)

    if training_level == "beginner":
        applied_rules.append("beginner_cautious_progression")
        profile_comments.append(
            "С учётом уровня подготовки рекомендуется повышать нагрузку постепенно, "
            "без резкого увеличения общего объёма."
        )

    elif training_level == "amateur":
        applied_rules.append("amateur_moderate_progression")
        profile_comments.append(
            "С учётом любительского уровня подготовки допустимо умеренное изменение "
            "нагрузки при сохранении контроля динамики."
        )

    elif training_level == "advanced":
        applied_rules.append("advanced_progression")
        profile_comments.append(
            "С учётом продвинутого уровня подготовки допускается более гибкая работа "
            "с нагрузкой, если не выявлены признаки перегрузки."
        )

    goal_comment = _build_goal_comment(training_goal, load_class)

    if goal_comment:
        applied_rules.append(f"goal_{training_goal}")
        profile_comments.append(goal_comment)

    if has_limitations:
        risk_level = "medium"
        max_increase_ratio = min(max_increase_ratio, 0.12)
        applied_rules.append("limitations_cautious_mode")

        limitation_names = [
            LIMITATION_LABELS.get(limitation, limitation)
            for limitation in limitations
        ]

        profile_warnings.append({
            "type": "limitations",
            "level": "warning",
            "title": "Указаны ограничения тренировочной нагрузки",
            "text": (
                "В профиле пользователя указаны ограничения: "
                f"{', '.join(limitation_names)}. Рекомендации FITDATA носят "
                "информационно-аналитический характер и должны применяться с осторожностью."
            ),
        })

        profile_comments.append(
            "С учётом указанных ограничений итоговая рекомендация сформирована "
            "в более осторожном режиме."
        )

    if has_strict_limitations:
        risk_level = "high"
        max_increase_ratio = min(max_increase_ratio, 0.05)
        applied_rules.append("strict_limitations_minimal_increase")

        profile_warnings.append({
            "type": "strict_limitations",
            "level": "danger",
            "title": "Повышенная осторожность",
            "text": (
                "В профиле указаны ограничения, при которых нежелательно резко "
                "увеличивать объём или интенсивность нагрузки. FITDATA не выполняет "
                "медицинскую диагностику."
            ),
        })

    if not disclaimer_accepted:
        risk_level = "high" if has_strict_limitations else "medium"
        applied_rules.append("disclaimer_not_accepted")

        profile_warnings.append({
            "type": "disclaimer",
            "level": "warning",
            "title": "Предупреждение не подтверждено",
            "text": (
                "Пользователь не подтвердил предупреждение об информационно-аналитическом "
                "характере рекомендаций. Рекомендации не являются медицинским назначением."
            ),
        })

    suggested_next_volume = _calculate_suggested_next_volume(
        current_volume=current_volume,
        predicted_next_volume=predicted_next_volume,
        load_class=load_class,
        max_increase_ratio=max_increase_ratio,
        has_limitations=has_limitations,
        has_strict_limitations=has_strict_limitations,
    )

    if suggested_next_volume is not None and predicted_next_volume is not None:
        if round(suggested_next_volume, 2) != round(predicted_next_volume, 2):
            applied_rules.append("suggested_volume_profile_cap")
            profile_comments.append(
                "Прогноз модели сохранён как аналитическое значение, однако с учётом "
                f"профиля пользователя для следующей тренировки рекомендуется более "
                f"осторожный ориентир: около {suggested_next_volume:.0f} кг."
            )

    if load_class == 2:
        applied_rules.append("ml_overload_priority")
        profile_comments.append(
            "Так как ML-модель выявила повышенную нагрузку, профиль пользователя "
            "не смягчает этот вывод, а усиливает осторожность итоговой рекомендации."
        )

    final_recommendation = recommendation

    if profile_comments:
        final_recommendation = f"{recommendation} {' '.join(profile_comments)}"

    return {
        "recommendation": final_recommendation,
        "suggested_next_volume": suggested_next_volume,
        "profile_warnings": profile_warnings,
        "profile_safety": {
            "is_applied": True,
            "risk_level": risk_level,
            "training_level": training_level,
            "training_level_label": TRAINING_LEVEL_LABELS.get(
                training_level,
                "Не указан",
            ),
            "training_goal": training_goal,
            "training_goal_label": TRAINING_GOAL_LABELS.get(
                training_goal,
                "Не указана",
            ),
            "limitations": limitations,
            "disclaimer_accepted": disclaimer_accepted,
            "applied_rules": applied_rules,
        },
    }


def _build_goal_comment(training_goal: str, load_class: int | None) -> str:
    if training_goal == "muscle_gain":
        if load_class == 2:
            return (
                "Цель набора мышечной массы учитывается, однако при признаках "
                "повышенной нагрузки дальнейший рост объёма следует ограничить."
            )

        return (
            "Для цели набора мышечной массы предпочтительно постепенное увеличение "
            "тренировочного объёма без резких скачков."
        )

    if training_goal == "strength":
        return (
            "Для цели развития силы важно контролировать не только общий объём, "
            "но и рабочие веса, технику и восстановление между тренировками."
        )

    if training_goal == "maintenance":
        return (
            "Для цели поддержания формы приоритетом является стабильность "
            "тренировочного режима, а не агрессивное увеличение объёма."
        )

    if training_goal == "general_fitness":
        return (
            "Для цели общего фитнеса приоритетом является регулярность и умеренность "
            "тренировочного процесса."
        )

    return ""


def _calculate_suggested_next_volume(
    current_volume: float | None,
    predicted_next_volume: float | None,
    load_class: int | None,
    max_increase_ratio: float,
    has_limitations: bool,
    has_strict_limitations: bool,
) -> float | None:
    if current_volume is None or current_volume <= 0:
        return predicted_next_volume

    if predicted_next_volume is None:
        return None

    if load_class == 2:
        reduction_ratio = 0.10

        if has_limitations:
            reduction_ratio = 0.15

        if has_strict_limitations:
            reduction_ratio = 0.20

        max_allowed_volume = current_volume * (1 - reduction_ratio)
        suggested = min(predicted_next_volume, max_allowed_volume)

        return round(max(0.0, suggested), 2)

    max_allowed_volume = current_volume * (1 + max_increase_ratio)
    suggested = min(predicted_next_volume, max_allowed_volume)

    return round(max(0.0, suggested), 2)


def _get_load_class(prediction_data: dict | None) -> int | None:
    if not prediction_data:
        return None

    load_class = prediction_data.get("load_class")

    if load_class is None:
        return None

    try:
        return int(load_class)
    except (TypeError, ValueError):
        return None


def _get_current_volume(prediction_data: dict | None) -> float | None:
    if not prediction_data:
        return None

    features = prediction_data.get("features") or {}
    total_volume = features.get("total_volume")

    if total_volume is None:
        return None

    try:
        return float(total_volume)
    except (TypeError, ValueError):
        return None


def _get_predicted_volume(prediction_data: dict | None) -> float | None:
    if not prediction_data:
        return None

    prediction = prediction_data.get("prediction") or {}
    predicted_next_volume = prediction.get("predicted_next_volume")

    if predicted_next_volume is None:
        predicted_next_volume = prediction_data.get("predicted_next_volume")

    if predicted_next_volume is None:
        return None

    try:
        return round(float(predicted_next_volume), 2)
    except (TypeError, ValueError):
        return None