from flask import Blueprint, request, jsonify

from database import get_connection


workout_routes = Blueprint("workout_routes", __name__)


@workout_routes.route("/api/exercises", methods=["GET"])
def get_exercises():
    with get_connection() as connection:
        exercises = connection.execute(
            """
            SELECT exercise_id, name, muscle_group, description
            FROM exercises
            ORDER BY name
            """
        ).fetchall()

    return jsonify([dict(exercise) for exercise in exercises])


@workout_routes.route("/api/workouts", methods=["POST"])
def create_workout():
    data = request.get_json()

    user_id = data.get("user_id")
    date = data.get("date")
    duration = data.get("duration")

    if not user_id or not date:
        return jsonify({"error": "Необходимо указать пользователя и дату тренировки"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO workouts (user_id, date, duration)
            VALUES (?, ?, ?)
            """,
            (user_id, date, duration)
        )

        workout_id = cursor.lastrowid

    return jsonify({
        "workout_id": workout_id,
        "user_id": user_id,
        "date": date,
        "duration": duration
    }), 201


@workout_routes.route("/api/workouts", methods=["GET"])
def get_workouts():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "Необходимо указать user_id"}), 400

    with get_connection() as connection:
        workouts = connection.execute(
            """
            SELECT workout_id, user_id, date, duration
            FROM workouts
            WHERE user_id = ?
            ORDER BY date DESC
            """,
            (user_id,)
        ).fetchall()

    return jsonify([dict(workout) for workout in workouts])


@workout_routes.route("/api/workout-exercises", methods=["POST"])
def add_exercise_to_workout():
    data = request.get_json()

    workout_id = data.get("workout_id")
    exercise_id = data.get("exercise_id")
    order_index = data.get("order_index")

    if not workout_id or not exercise_id or order_index is None:
        return jsonify({"error": "Необходимо указать workout_id, exercise_id и order_index"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
            VALUES (?, ?, ?)
            """,
            (workout_id, exercise_id, order_index)
        )

        workout_exercise_id = cursor.lastrowid

    return jsonify({
        "workout_exercise_id": workout_exercise_id,
        "workout_id": workout_id,
        "exercise_id": exercise_id,
        "order_index": order_index
    }), 201


@workout_routes.route("/api/sets", methods=["POST"])
def add_set():
    data = request.get_json()

    workout_exercise_id = data.get("workout_exercise_id")
    set_number = data.get("set_number")
    weight = data.get("weight")
    reps = data.get("reps")

    if not workout_exercise_id or not set_number or weight is None or reps is None:
        return jsonify({"error": "Необходимо указать параметры подхода"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO sets (workout_exercise_id, set_number, weight, reps)
            VALUES (?, ?, ?, ?)
            """,
            (workout_exercise_id, set_number, weight, reps)
        )

        set_id = cursor.lastrowid

    return jsonify({
        "set_id": set_id,
        "workout_exercise_id": workout_exercise_id,
        "set_number": set_number,
        "weight": weight,
        "reps": reps
    }), 201


@workout_routes.route("/api/workouts/<int:workout_id>", methods=["GET"])
def get_workout_details(workout_id):
    with get_connection() as connection:
        workout = connection.execute(
            """
            SELECT workout_id, user_id, date, duration
            FROM workouts
            WHERE workout_id = ?
            """,
            (workout_id,)
        ).fetchone()

        if workout is None:
            return jsonify({"error": "Тренировка не найдена"}), 404

        exercises = connection.execute(
            """
            SELECT 
                we.workout_exercise_id,
                we.order_index,
                e.exercise_id,
                e.name,
                e.muscle_group,
                e.description
            FROM workout_exercises we
            JOIN exercises e ON e.exercise_id = we.exercise_id
            WHERE we.workout_id = ?
            ORDER BY we.order_index
            """,
            (workout_id,)
        ).fetchall()

        result_exercises = []

        for exercise in exercises:
            sets = connection.execute(
                """
                SELECT set_id, set_number, weight, reps
                FROM sets
                WHERE workout_exercise_id = ?
                ORDER BY set_number
                """,
                (exercise["workout_exercise_id"],)
            ).fetchall()

            exercise_dict = dict(exercise)
            exercise_dict["sets"] = [dict(item) for item in sets]
            result_exercises.append(exercise_dict)

    workout_dict = dict(workout)
    workout_dict["exercises"] = result_exercises

    return jsonify(workout_dict)


@workout_routes.route("/api/sets/<int:set_id>", methods=["DELETE"])
def delete_set(set_id):
    with get_connection() as connection:
        existing_set = connection.execute(
            """
            SELECT set_id
            FROM sets
            WHERE set_id = ?
            """,
            (set_id,)
        ).fetchone()

        if existing_set is None:
            return jsonify({"error": "Подход не найден"}), 404

        connection.execute(
            """
            DELETE FROM sets
            WHERE set_id = ?
            """,
            (set_id,)
        )

    return jsonify({"message": "Подход удален"})


@workout_routes.route("/api/sets/<int:set_id>", methods=["PUT"])
def update_set(set_id):
    data = request.get_json()

    weight = data.get("weight")
    reps = data.get("reps")

    if weight is None or reps is None:
        return jsonify({"error": "Необходимо указать вес и количество повторений"}), 400

    with get_connection() as connection:
        existing_set = connection.execute(
            """
            SELECT set_id
            FROM sets
            WHERE set_id = ?
            """,
            (set_id,)
        ).fetchone()

        if existing_set is None:
            return jsonify({"error": "Подход не найден"}), 404

        connection.execute(
            """
            UPDATE sets
            SET weight = ?, reps = ?
            WHERE set_id = ?
            """,
            (weight, reps, set_id)
        )

    return jsonify({
        "set_id": set_id,
        "weight": weight,
        "reps": reps
    })