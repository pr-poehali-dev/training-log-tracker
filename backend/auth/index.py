import json
import os
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
SCHEMA = S
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
    """Auth: action=login|register|trainers через ?action=..."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "POST")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "login")
    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    # POST ?action=login
    if method == "POST" and action == "login":
        username = body.get("username", "").strip()
        password = body.get("password", "").strip()
        if not username or not password:
            cur.close(); conn.close()
            return err("Введите логин и пароль")
        cur.execute(
            f"SELECT id, username, role, full_name, hall FROM {S}.users WHERE username=%s AND password=%s",
            (username, password)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return err("Неверный логин или пароль", 401)
        return ok({"id": row[0], "username": row[1], "role": row[2], "full_name": row[3], "hall": row[4]})

    # POST ?action=register  (только admin)
    if method == "POST" and action == "register":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        username  = body.get("username", "").strip()
        password  = body.get("password", "").strip()
        full_name = body.get("full_name", "").strip()
        hall      = body.get("hall", "").strip()
        if not username or not password or not full_name:
            cur.close(); conn.close()
            return err("Заполните все поля")
        cur.execute(f"SELECT id FROM {S}.users WHERE username=%s", (username,))
        if cur.fetchone():
            cur.close(); conn.close()
            return err("Логин уже занят")
        cur.execute(
            f"INSERT INTO {S}.users (username, password, role, full_name, hall) VALUES (%s,%s,'trainer',%s,%s) RETURNING id",
            (username, password, full_name, hall or None)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return ok({"id": new_id, "username": username, "role": "trainer", "full_name": full_name, "hall": hall})

    # GET ?action=trainers  (admin only)
    if method == "GET" and action == "trainers":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        cur.execute(
            f"SELECT id, username, role, full_name, hall, created_at FROM {S}.users WHERE role='trainer' ORDER BY full_name"
        )
        trainers = [{"id": r[0], "username": r[1], "role": r[2], "full_name": r[3], "hall": r[4], "created_at": str(r[5])} for r in cur.fetchall()]
        cur.close(); conn.close()
        return ok(trainers)

    # DELETE ?action=delete_trainer&id=X  (admin only)
    if method == "DELETE" and action == "delete_trainer":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        tid = qs.get("id")
        if not tid:
            cur.close(); conn.close()
            return err("Нет id")
        cur.execute(f"SELECT id FROM {S}.users WHERE id=%s AND role='trainer'", (tid,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return err("Тренер не найден", 404)
        cur.execute(f"DELETE FROM {S}.users WHERE id=%s", (tid,))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Тренер удалён"})

    cur.close(); conn.close()
    return err("Неверный action", 400)