from werkzeug.security import generate_password_hash
from database import get_connection, init_database


def seed_database():
    init_database()

    exercises = [
        ("Жим лежа", "Грудные мышцы", "Базовое упражнение для развития грудных мышц"),
        ("Присед", "Ноги", "Базовое упражнение для развития мышц ног"),
        ("Становая тяга", "Спина", "Базовое упражнение для развития спины и задней цепи"),
        ("Подтягивания", "Спина", "Упражнение с собственным весом"),
        ("Жим гантелей", "Грудные мышцы", "Упражнение для грудных мышц с гантелями"),
        ("Тяга верхнего блока", "Спина", "Упражнение для широчайших мышц спины"),
        ("Сгибание рук со штангой", "Бицепс", "Изолирующее упражнение для бицепса"),
        ("Разгибание рук на блоке", "Трицепс", "Изолирующее упражнение для трицепса"),
    ]

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (email, password_hash)
            VALUES (?, ?)
            """,
            ("test@fitdata.ru", generate_password_hash("123456"))
        )

        connection.executemany(
            """
            INSERT INTO exercises (name, muscle_group, description)
            VALUES (?, ?, ?)
            """,
            exercises
        )

    print("Тестовые данные добавлены")


if __name__ == "__main__":
    seed_database()