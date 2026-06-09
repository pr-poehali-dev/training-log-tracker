import json
import os
import csv

import io
import base64
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

# Колонки шаблона → поля БД
COLUMN_MAP = {
    "имя":          "name",
    "зал":          "hall",
    "группа":       "grp",
    "телефон":      "phone",
    "икo":          "iko",
    "ико":          "iko",
    "абонемент":    "fee",
    "уровень":      "lvl",
    "дата рождения": "birthdate",
    "расписание":   "schedule",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}

def parse_date(val: str):
    val = val.strip()
    if not val:
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            from datetime import datetime
            return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def handler(event: dict, context) -> dict:
    """Массовый импорт учеников из CSV-файла (base64). Колонки: Имя, Зал, Группа, Телефон, ИКО, Абонемент, Уровень, Дата рождения, Расписание."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    if not user_id:
        return err("Не авторизован", 401)

    body = json.loads(event.get("body") or "{}")
    csv_b64 = body.get("csv_base64", "")
    if not csv_b64:
        return err("Нет файла")

    # Декодируем base64 → текст
    try:
        csv_bytes = base64.b64decode(csv_b64)
        # Пробуем UTF-8, потом cp1251 (Excel)
        try:
            csv_text = csv_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            csv_text = csv_bytes.decode("cp1251")
    except Exception:
        return err("Не удалось прочитать файл. Сохраните как CSV UTF-8.")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT id, role FROM {S}.users WHERE id=%s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return err("Пользователь не найден", 401)
    uid, role = user
    if role == "admin":
        cur.close(); conn.close()
        return err("Администратор не может импортировать учеников напрямую. Войдите как тренер.")

    # Автоопределяем разделитель (Excel RU сохраняет через ";", остальные через ",")
    first_line = csv_text.split("\n")[0]
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(csv_text), delimiter=delimiter)
    if not reader.fieldnames:
        cur.close(); conn.close()
        return err("Файл пустой или неверный формат")

    added = []
    skipped = []

    for i, raw_row in enumerate(reader, start=2):
        # Нормализуем ключи строки
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items()}

        name = row.get("имя", "").strip()
        if not name:
            skipped.append({"row": i, "reason": "Пустое имя"})
            continue

        # Собираем поля
        fee_raw = row.get("абонемент", "")
        try:
            fee = int(fee_raw) if fee_raw else 3000
        except ValueError:
            fee = 3000

        birthdate = parse_date(row.get("дата рождения", ""))

        try:
            cur.execute(f"""
                INSERT INTO {S}.students
                  (trainer_id, name, hall, grp, phone, iko, fee, lvl, birthdate, schedule)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                uid,
                name,
                row.get("зал") or None,
                row.get("группа") or None,
                row.get("телефон") or None,
                row.get("ико") or row.get("икo") or None,
                fee,
                row.get("уровень") or None,
                birthdate,
                row.get("расписание") or None,
            ))
            new_id = cur.fetchone()[0]
            added.append({"id": new_id, "name": name})
        except Exception as e:
            conn.rollback()
            skipped.append({"row": i, "name": name, "reason": str(e)})
            # Пересоздаём курсор после rollback
            cur.close()
            cur = conn.cursor()
            continue

    conn.commit()
    cur.close()
    conn.close()

    return ok({
        "added": len(added),
        "skipped": len(skipped),
        "skipped_details": skipped[:20],
    })