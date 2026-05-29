import json
from flask import Blueprint, request, jsonify

from database import get_connection


profile_routes = Blueprint("profile_routes", __name__)


ALLOWED_TRAINING_LEVELS = {"beginner", "amateur", "advanced"}

ALLOWED_TRAINING_GOALS = {
    "muscle_gain",
    "strength",
    "maintenance",
    "general_fitness",
}

ALLOWED_LIMITATIONS = {
    "back",
    "knees",
    "cardio",
    "blood_pressure",
    "injuries",
    "other",
}


def parse_health_limitations(value):
    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, str):
        try:
            parsed_value = json.loads(value)
            return parsed_value if isinstance(parsed_value, list) else []
        except json.JSONDecodeError:
            return [
                item.strip()
                for item in value.split(",")
                if item.strip()
            ]

    return []


def serialize_health_limitations(limitations):
    if limitations is None:
        return "[]"

    if not isinstance(limitations, list):
        return "[]"

    clean_limitations = [
        limitation
        for limitation in limitations
        if limitation in ALLOWED_LIMITATIONS
    ]

    return json.dumps(clean_limitations, ensure_ascii=False)


def profile_row_to_dict(row):
    if row is None:
        return None

    profile = dict(row)
    profile["health_limitations"] = parse_health_limitations(
        profile.get("health_limitations")
    )
    profile["disclaimer_accepted"] = bool(profile.get("disclaimer_accepted"))

    return profile


def build_empty_profile(user):
    return {
        "id": None,
        "user_id": user["user_id"],
        "full_name": "",
        "email": user["email"],
        "age": None,
        "training_level": "",
        "training_goal": "",
        "health_limitations": [],
        "disclaimer_accepted": False,
        "created_at": None,
        "updated_at": None,
    }


def get_user_by_id(connection, user_id):
    return connection.execute(
        """
        SELECT user_id, email
        FROM users
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()


def validate_profile_payload(data):
    errors = []

    user_id = data.get("user_id")

    if not user_id:
        errors.append("Необходимо указать user_id")

    full_name = str(data.get("full_name") or "").strip()
    email = str(data.get("email") or "").strip()
    age = data.get("age")
    training_level = str(data.get("training_level") or "").strip()
    training_goal = str(data.get("training_goal") or "").strip()
    health_limitations = data.get("health_limitations", [])
    disclaimer_accepted = bool(data.get("disclaimer_accepted", False))

    if age in ("", None):
        age = None

    if age is not None:
        try:
            age = int(age)
        except (TypeError, ValueError):
            errors.append("Возраст должен быть числом")

        if isinstance(age, int) and (age < 14 or age > 100):
            errors.append("Возраст должен быть в диапазоне от 14 до 100")

    if training_level and training_level not in ALLOWED_TRAINING_LEVELS:
        errors.append("Некорректный уровень подготовки")

    if training_goal and training_goal not in ALLOWED_TRAINING_GOALS:
        errors.append("Некорректная цель тренировок")

    if health_limitations is None:
        health_limitations = []

    if not isinstance(health_limitations, list):
        errors.append("Ограничения тренировочной нагрузки должны быть списком")
        health_limitations = []

    invalid_limitations = [
        limitation
        for limitation in health_limitations
        if limitation not in ALLOWED_LIMITATIONS
    ]

    if invalid_limitations:
        errors.append("Некорректные значения ограничений тренировочной нагрузки")

    return {
        "errors": errors,
        "profile": {
            "user_id": user_id,
            "full_name": full_name,
            "email": email,
            "age": age,
            "training_level": training_level,
            "training_goal": training_goal,
            "health_limitations": health_limitations,
            "disclaimer_accepted": disclaimer_accepted,
        },
    }


@profile_routes.route("/api/profile", methods=["GET"])
def get_profile():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({"error": "Необходимо указать user_id"}), 400

    with get_connection() as connection:
        user = get_user_by_id(connection, user_id)

        if user is None:
            return jsonify({"error": "Пользователь не найден"}), 404

        profile = connection.execute(
            """
            SELECT
                id,
                user_id,
                full_name,
                email,
                age,
                training_level,
                training_goal,
                health_limitations,
                disclaimer_accepted,
                created_at,
                updated_at
            FROM user_profiles
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

    if profile is None:
        return jsonify({
            "profile": build_empty_profile(user),
            "exists": False,
        })

    return jsonify({
        "profile": profile_row_to_dict(profile),
        "exists": True,
    })


@profile_routes.route("/api/profile", methods=["POST"])
def create_profile():
    data = request.get_json() or {}
    validation = validate_profile_payload(data)

    if validation["errors"]:
        return jsonify({"error": validation["errors"][0]}), 400

    profile = validation["profile"]

    with get_connection() as connection:
        user = get_user_by_id(connection, profile["user_id"])

        if user is None:
            return jsonify({"error": "Пользователь не найден"}), 404

        existing_profile = connection.execute(
            """
            SELECT id
            FROM user_profiles
            WHERE user_id = ?
            """,
            (profile["user_id"],),
        ).fetchone()

        if existing_profile is not None:
            return jsonify({"error": "Профиль пользователя уже существует"}), 409

        cursor = connection.execute(
            """
            INSERT INTO user_profiles (
                user_id,
                full_name,
                email,
                age,
                training_level,
                training_goal,
                health_limitations,
                disclaimer_accepted
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile["user_id"],
                profile["full_name"],
                profile["email"] or user["email"],
                profile["age"],
                profile["training_level"],
                profile["training_goal"],
                serialize_health_limitations(profile["health_limitations"]),
                int(profile["disclaimer_accepted"]),
            ),
        )

        profile_id = cursor.lastrowid

        saved_profile = connection.execute(
            """
            SELECT
                id,
                user_id,
                full_name,
                email,
                age,
                training_level,
                training_goal,
                health_limitations,
                disclaimer_accepted,
                created_at,
                updated_at
            FROM user_profiles
            WHERE id = ?
            """,
            (profile_id,),
        ).fetchone()

    return jsonify({
        "profile": profile_row_to_dict(saved_profile),
        "message": "Профиль создан",
    }), 201


@profile_routes.route("/api/profile", methods=["PUT"])
def update_profile():
    data = request.get_json() or {}
    validation = validate_profile_payload(data)

    if validation["errors"]:
        return jsonify({"error": validation["errors"][0]}), 400

    profile = validation["profile"]

    with get_connection() as connection:
        user = get_user_by_id(connection, profile["user_id"])

        if user is None:
            return jsonify({"error": "Пользователь не найден"}), 404

        existing_profile = connection.execute(
            """
            SELECT id
            FROM user_profiles
            WHERE user_id = ?
            """,
            (profile["user_id"],),
        ).fetchone()

        if existing_profile is None:
            cursor = connection.execute(
                """
                INSERT INTO user_profiles (
                    user_id,
                    full_name,
                    email,
                    age,
                    training_level,
                    training_goal,
                    health_limitations,
                    disclaimer_accepted
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile["user_id"],
                    profile["full_name"],
                    profile["email"] or user["email"],
                    profile["age"],
                    profile["training_level"],
                    profile["training_goal"],
                    serialize_health_limitations(profile["health_limitations"]),
                    int(profile["disclaimer_accepted"]),
                ),
            )

            profile_id = cursor.lastrowid
        else:
            profile_id = existing_profile["id"]

            connection.execute(
                """
                UPDATE user_profiles
                SET
                    full_name = ?,
                    email = ?,
                    age = ?,
                    training_level = ?,
                    training_goal = ?,
                    health_limitations = ?,
                    disclaimer_accepted = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (
                    profile["full_name"],
                    profile["email"] or user["email"],
                    profile["age"],
                    profile["training_level"],
                    profile["training_goal"],
                    serialize_health_limitations(profile["health_limitations"]),
                    int(profile["disclaimer_accepted"]),
                    profile["user_id"],
                ),
            )

        saved_profile = connection.execute(
            """
            SELECT
                id,
                user_id,
                full_name,
                email,
                age,
                training_level,
                training_goal,
                health_limitations,
                disclaimer_accepted,
                created_at,
                updated_at
            FROM user_profiles
            WHERE id = ?
            """,
            (profile_id,),
        ).fetchone()

    return jsonify({
        "profile": profile_row_to_dict(saved_profile),
        "message": "Профиль обновлён",
    })