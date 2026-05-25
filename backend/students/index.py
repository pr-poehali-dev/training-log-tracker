import json
import os
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    """CRUD учеников: тренер видит только своих, admin видит всех"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    qs = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    if not user_id:
        return err("Не авторизован", 401)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT id, role, hall FROM {S}.users WHERE id=%s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return err("Пользователь не найден", 401)
    uid, role, hall = user

    # GET — список учеников
    if method == "GET":
        if role == "admin":
            trainer_filter = qs.get("trainer_id")
            if trainer_filter:
                cur.execute(f"""
                    SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                    JOIN {S}.users u ON u.id = s.trainer_id
                    WHERE s.trainer_id=%s ORDER BY s.name
                """, (trainer_filter,))
            else:
                cur.execute(f"""
                    SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                    JOIN {S}.users u ON u.id = s.trainer_id
                    ORDER BY u.full_name, s.name
                """)
        else:
            cur.execute(f"""
                SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                JOIN {S}.users u ON u.id = s.trainer_id
                WHERE s.trainer_id=%s ORDER BY s.name
            """, (uid,))

        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        cur.close(); conn.close()
        return ok(rows)

    # POST — создать ученика
    if method == "POST":
        if role == "admin":
            cur.close(); conn.close()
            return err("Администратор не добавляет учеников")
        name = body.get("name", "").strip()
        if not name:
            cur.close(); conn.close()
            return err("Имя обязательно")
        cur.execute(f"""
            INSERT INTO {S}.students (trainer_id, name, hall, grp, schedule, phone, iko, fee, lvl, cert, cert_from, cert_to)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (
            uid, name,
            body.get("hall") or None, body.get("grp") or None,
            body.get("schedule") or None,
            body.get("phone") or None, body.get("iko") or None,
            int(body.get("fee", 3000)),
            body.get("lvl") or None,
            bool(body.get("cert", False)),
            body.get("cert_from") or None, body.get("cert_to") or None
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return ok({"id": new_id, "message": "Ученик добавлен"})

    # PUT — обновить ученика
    if method == "PUT":
        sid = qs.get("id")
        if not sid:
            cur.close(); conn.close()
            return err("Нет id")
        cur.execute(f"SELECT trainer_id FROM {S}.students WHERE id=%s", (sid,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Ученик не найден", 404)
        if role != "admin" and str(row[0]) != str(uid):
            cur.close(); conn.close()
            return err("Нет прав", 403)
        cur.execute(f"""
            UPDATE {S}.students SET name=%s, hall=%s, grp=%s, schedule=%s, phone=%s, iko=%s,
            fee=%s, lvl=%s, cert=%s, cert_from=%s, cert_to=%s WHERE id=%s
        """, (
            body.get("name"), body.get("hall") or None, body.get("grp") or None,
            body.get("schedule") or None,
            body.get("phone") or None, body.get("iko") or None,
            int(body.get("fee", 3000)), body.get("lvl") or None,
            bool(body.get("cert", False)),
            body.get("cert_from") or None, body.get("cert_to") or None,
            sid
        ))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Обновлено"})

    # DELETE
    if method == "DELETE":
        sid = qs.get("id")
        if not sid:
            cur.close(); conn.close()
            return err("Нет id")
        cur.execute(f"SELECT trainer_id FROM {S}.students WHERE id=%s", (sid,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Ученик не найден", 404)
        if role != "admin" and str(row[0]) != str(uid):
            cur.close(); conn.close()
            return err("Нет прав", 403)
        cur.execute(f"DELETE FROM {S}.personal_sessions WHERE student_id=%s", (sid,))
        cur.execute(f"DELETE FROM {S}.attendance WHERE student_id=%s", (sid,))
        cur.execute(f"DELETE FROM {S}.payments WHERE student_id=%s", (sid,))
        cur.execute(f"DELETE FROM {S}.students WHERE id=%s", (sid,))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Удалено"})

    cur.close(); conn.close()
    return err("Method not allowed", 405)