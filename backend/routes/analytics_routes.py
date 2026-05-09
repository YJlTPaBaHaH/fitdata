from flask import Blueprint, request, jsonify

from database import get_connection


analytics_routes = Blueprint("analytics_routes", __name__)


@analytics_routes.route("/api/analytics/exercise", methods=["GET"])
def get_exercise_analytics():
    user_id = request.args.get("user_id")
    exercise_name = request.args.get("name")

    if not user_id or not exercise_name:
        return jsonify({"error": "Необходимо указать user_id и name"}), 400

    with get_connection() as connection:
        records = connection.execute(
            """
            SELECT
                s.set_id,
                w.workout_id,
                we.workout_exercise_id,
                e.exercise_id,
                e.name,
                w.date,
                s.weight,
                s.reps,
                s.set_number
            FROM sets s
            JOIN workout_exercises we ON we.workout_exercise_id = s.workout_exercise_id
            JOIN workouts w ON w.workout_id = we.workout_id
            JOIN exercises e ON e.exercise_id = we.exercise_id
            WHERE w.user_id = ?
              AND e.name = ?
            ORDER BY w.date DESC, s.set_id DESC
            """,
            (user_id, exercise_name)
        ).fetchall()

    return jsonify([dict(record) for record in records])


@analytics_routes.route("/api/analytics/record", methods=["POST"])
def add_analytics_record():
    data = request.get_json()

    user_id = data.get("user_id")
    exercise_name = data.get("name")
    weight = data.get("weight")
    reps = data.get("reps")
    date = data.get("date")

    if not user_id or not exercise_name or weight is None or reps is None or not date:
        return jsonify({"error": "Необходимо указать user_id, name, weight, reps и date"}), 400

    with get_connection() as connection:
        exercise = connection.execute(
            """
            SELECT exercise_id
            FROM exercises
            WHERE name = ?
            """,
            (exercise_name,)
        ).fetchone()

        if exercise is None:
            return jsonify({"error": "Упражнение не найдено"}), 404

        workout_cursor = connection.execute(
            """
            INSERT INTO workouts (user_id, date, duration)
            VALUES (?, ?, ?)
            """,
            (user_id, date, None)
        )

        workout_id = workout_cursor.lastrowid

        workout_exercise_cursor = connection.execute(
            """
            INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
            VALUES (?, ?, ?)
            """,
            (workout_id, exercise["exercise_id"], 1)
        )

        workout_exercise_id = workout_exercise_cursor.lastrowid

        set_cursor = connection.execute(
            """
            INSERT INTO sets (workout_exercise_id, set_number, weight, reps)
            VALUES (?, ?, ?, ?)
            """,
            (workout_exercise_id, 1, weight, reps)
        )

        set_id = set_cursor.lastrowid

    return jsonify({
        "set_id": set_id,
        "workout_id": workout_id,
        "workout_exercise_id": workout_exercise_id,
        "exercise_id": exercise["exercise_id"],
        "name": exercise_name,
        "date": date,
        "weight": weight,
        "reps": reps
    }), 201