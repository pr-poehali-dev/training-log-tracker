import json
import os
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def handler(event: dict, context) -> dict:
    """Уведомления: GET — получить свои, POST mark_read — пометить прочитанными."""
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

    cur.execute(f"SELECT id, role FROM {S}.users WHERE id=%s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return err("Пользователь не найден", 401)
    uid, role = user

    if method == "GET":
        cur.execute(f"""
            SELECT id, type, message, read, created_at
            FROM {S}.notifications
            WHERE user_id=%s
            ORDER BY created_at DESC
            LIMIT 50
        """, (uid,))
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        unread = sum(1 for r in rows if not r["read"])
        cur.close(); conn.close()
        return ok({"notifications": rows, "unread": unread})

    if method == "POST":
        action = qs.get("action") or body.get("action")

        if action == "mark_read":
            nid = body.get("id")
            if nid:
                cur.execute(f"UPDATE {S}.notifications SET read=TRUE WHERE id=%s AND user_id=%s", (nid, uid))
            else:
                cur.execute(f"UPDATE {S}.notifications SET read=TRUE WHERE user_id=%s", (uid,))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Прочитано"})

    cur.close(); conn.close()
    return err("Неверный запрос", 400)
