from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from database import get_connection


auth_routes = Blueprint("auth_routes", __name__)


@auth_routes.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Необходимо указать электронную почту и пароль"}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (?, ?)
                """,
                (email, password_hash)
            )

            user_id = cursor.lastrowid

        return jsonify({
            "user_id": user_id,
            "email": email
        }), 201

    except Exception:
        return jsonify({"error": "Пользователь с такой электронной почтой уже существует"}), 409


@auth_routes.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    with get_connection() as connection:
        user = connection.execute(
            """
            SELECT user_id, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

    if user is None:
        return jsonify({"error": "Пользователь не найден"}), 404

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Неверный пароль"}), 401

    return jsonify({
        "user_id": user["user_id"],
        "email": user["email"]
    })