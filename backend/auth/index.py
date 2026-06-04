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
    """Auth: action=login|register|trainers|toggle_permission|update_trainer через ?action=..."""
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
            f"SELECT id, username, role, full_name, hall, schedule, can_edit_journal, trainings_per_month FROM {S}.users WHERE username=%s AND password=%s",
            (username, password)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return err("Неверный логин или пароль", 401)
        return ok({"id": row[0], "username": row[1], "role": row[2], "full_name": row[3], "hall": row[4], "schedule": row[5], "can_edit_journal": row[6], "trainings_per_month": row[7]})

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
        schedule  = body.get("schedule", "").strip()
        trainings_per_month = int(body.get("trainings_per_month", 13))
        if not username or not password or not full_name:
            cur.close(); conn.close()
            return err("Заполните все поля")
        cur.execute(f"SELECT id FROM {S}.users WHERE username=%s", (username,))
        if cur.fetchone():
            cur.close(); conn.close()
            return err("Логин уже занят")
        cur.execute(
            f"INSERT INTO {S}.users (username, password, role, full_name, hall, schedule, can_edit_journal, trainings_per_month) VALUES (%s,%s,'trainer',%s,%s,%s,TRUE,%s) RETURNING id",
            (username, password, full_name, hall or None, schedule or None, trainings_per_month)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return ok({"id": new_id, "username": username, "role": "trainer", "full_name": full_name, "hall": hall, "schedule": schedule, "can_edit_journal": True, "trainings_per_month": trainings_per_month})

    # GET ?action=trainers  (admin only)
    if method == "GET" and action == "trainers":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        cur.execute(f"""
            SELECT
                u.id, u.username, u.role, u.full_name, u.hall, u.schedule,
                u.can_edit_journal, u.created_at, u.trainings_per_month, u.birthdate,
                COUNT(DISTINCT s.id) FILTER (WHERE s.archived = FALSE) AS student_count,
                COUNT(DISTINCT s.id) FILTER (WHERE s.archived = TRUE)  AS archived_count,
                COUNT(DISTINCT s.id) FILTER (
                    WHERE s.archived = FALSE
                    AND s.created_at >= NOW() - INTERVAL '30 days'
                ) AS new_count
            FROM {S}.users u
            LEFT JOIN {S}.students s ON s.trainer_id = u.id
            WHERE u.role = 'trainer'
            GROUP BY u.id
            ORDER BY u.full_name
        """)
        cols = [d[0] for d in cur.description]
        trainers = []
        for r in cur.fetchall():
            t = dict(zip(cols, r))
            t["created_at"] = str(t["created_at"])
            t["student_count"]  = int(t["student_count"]  or 0)
            t["archived_count"] = int(t["archived_count"] or 0)
            t["new_count"]      = int(t["new_count"]      or 0)
            trainers.append(t)

        # paid_count за текущий месяц для каждого тренера
        import datetime
        cur_month = datetime.date.today().strftime("%Y-%m")
        cur.execute(f"""
            SELECT s.trainer_id, COUNT(DISTINCT p.student_id) as paid_count
            FROM {S}.payments p
            JOIN {S}.students s ON s.id = p.student_id
            WHERE p.month = %s AND p.paid = TRUE AND s.archived = FALSE
            GROUP BY s.trainer_id
        """, (cur_month,))
        paid_map = {r[0]: int(r[1]) for r in cur.fetchall()}
        for t in trainers:
            t["paid_count"] = paid_map.get(t["id"], 0)
            t["cur_month"]  = cur_month

        cur.close(); conn.close()
        return ok(trainers)

    # PUT ?action=update_trainer&id=X  (admin only)
    if method == "PUT" and action == "update_trainer":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        tid = qs.get("id")
        if not tid:
            cur.close(); conn.close()
            return err("Нет id")
        full_name = body.get("full_name", "").strip()
        hall      = body.get("hall", "").strip()
        schedule  = body.get("schedule", "").strip()
        trainings_per_month = int(body.get("trainings_per_month", 13))
        password  = body.get("password", "").strip()
        if not full_name:
            cur.close(); conn.close()
            return err("ФИО обязательно")
        birthdate = body.get("birthdate") or None
        if password:
            cur.execute(
                f"UPDATE {S}.users SET full_name=%s, hall=%s, schedule=%s, trainings_per_month=%s, password=%s, birthdate=%s WHERE id=%s AND role='trainer'",
                (full_name, hall or None, schedule or None, trainings_per_month, password, birthdate, tid)
            )
        else:
            cur.execute(
                f"UPDATE {S}.users SET full_name=%s, hall=%s, schedule=%s, trainings_per_month=%s, birthdate=%s WHERE id=%s AND role='trainer'",
                (full_name, hall or None, schedule or None, trainings_per_month, birthdate, tid)
            )
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Обновлено"})

    # POST ?action=toggle_permission&id=X  (admin only)
    if method == "POST" and action == "toggle_permission":
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row or row[0] != "admin":
            cur.close(); conn.close()
            return err("Нет прав", 403)
        tid = qs.get("id")
        if not tid:
            cur.close(); conn.close()
            return err("Нет id")
        cur.execute(f"SELECT can_edit_journal FROM {S}.users WHERE id=%s AND role='trainer'", (tid,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Тренер не найден", 404)
        new_val = not row[0]
        cur.execute(f"UPDATE {S}.users SET can_edit_journal=%s WHERE id=%s", (new_val, tid))
        conn.commit()
        cur.close(); conn.close()
        return ok({"can_edit_journal": new_val})

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