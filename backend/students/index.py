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
    """CRUD учеников. Архив при удалении. Новые поля: hall2, birthdate, annual_fee_number, insurance, insurance_to."""
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

    # GET — список учеников (по умолчанию только активные, ?archived=1 для архива)
    if method == "GET":
        show_archived = qs.get("archived") == "1"
        archived_cond = "s.archived = TRUE" if show_archived else "s.archived = FALSE"

        if role == "admin":
            trainer_filter = qs.get("trainer_id")
            if trainer_filter:
                cur.execute(f"""
                    SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                    JOIN {S}.users u ON u.id = s.trainer_id
                    WHERE s.trainer_id=%s AND {archived_cond} ORDER BY s.name
                """, (trainer_filter,))
            else:
                cur.execute(f"""
                    SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                    JOIN {S}.users u ON u.id = s.trainer_id
                    WHERE {archived_cond} ORDER BY u.full_name, s.name
                """)
        else:
            cur.execute(f"""
                SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                JOIN {S}.users u ON u.id = s.trainer_id
                WHERE s.trainer_id=%s AND {archived_cond} ORDER BY s.name
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
        team_level = body.get("team_level", "regular")
        if team_level not in ("regular", "first", "national"):
            team_level = "regular"
        cur.execute(f"""
            INSERT INTO {S}.students
              (trainer_id, name, hall, hall2, grp, schedule, phone, iko, fee,
               annual_fee_number, lvl, cert, cert_from, cert_to,
               birthdate, insurance, insurance_to, has_sport, sport_schedule, team_level)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at
        """, (
            uid, name,
            body.get("hall") or None, body.get("hall2") or None,
            body.get("grp") or None, body.get("schedule") or None,
            body.get("phone") or None, body.get("iko") or None,
            int(body.get("fee", 3000)),
            body.get("annual_fee_number") or None,
            body.get("lvl") or None,
            bool(body.get("cert", False)),
            body.get("cert_from") or None, body.get("cert_to") or None,
            body.get("birthdate") or None,
            bool(body.get("insurance", False)),
            body.get("insurance_to") or None,
            bool(body.get("has_sport", False)),
            body.get("sport_schedule") or None,
            team_level,
        ))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({"id": row[0], "created_at": str(row[1]), "message": "Ученик добавлен"})

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
        team_level = body.get("team_level", "regular")
        if team_level not in ("regular", "first", "national"):
            team_level = "regular"
        cur.execute(f"""
            UPDATE {S}.students SET
              name=%s, hall=%s, hall2=%s, grp=%s, schedule=%s, phone=%s, iko=%s,
              fee=%s, annual_fee_number=%s, lvl=%s,
              cert=%s, cert_from=%s, cert_to=%s,
              birthdate=%s, insurance=%s, insurance_to=%s,
              has_sport=%s, sport_schedule=%s, team_level=%s
            WHERE id=%s
        """, (
            body.get("name"),
            body.get("hall") or None, body.get("hall2") or None,
            body.get("grp") or None, body.get("schedule") or None,
            body.get("phone") or None, body.get("iko") or None,
            int(body.get("fee", 3000)),
            body.get("annual_fee_number") or None,
            body.get("lvl") or None,
            bool(body.get("cert", False)),
            body.get("cert_from") or None, body.get("cert_to") or None,
            body.get("birthdate") or None,
            bool(body.get("insurance", False)),
            body.get("insurance_to") or None,
            bool(body.get("has_sport", False)),
            body.get("sport_schedule") or None,
            team_level,
            sid
        ))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Обновлено"})

    # DELETE — архивировать (не удалять физически), причина обязательна
    if method == "DELETE":
        sid = qs.get("id")
        if not sid:
            cur.close(); conn.close()
            return err("Нет id")
        cur.execute(f"SELECT trainer_id FROM {S}.students WHERE id=%s AND archived=FALSE", (sid,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err("Ученик не найден", 404)
        if role != "admin" and str(row[0]) != str(uid):
            cur.close(); conn.close()
            return err("Нет прав", 403)
        reason = (body.get("reason") or "").strip()
        if not reason:
            cur.close(); conn.close()
            return err("Укажите причину архивирования")

        cur.execute(f"SELECT name FROM {S}.students WHERE id=%s", (sid,))
        student_name = (cur.fetchone() or ["?"])[0]
        cur.execute(f"SELECT full_name FROM {S}.users WHERE id=%s", (uid,))
        trainer_name = (cur.fetchone() or ["?"])[0]

        cur.execute(f"""
            UPDATE {S}.students SET archived=TRUE, archive_reason=%s, archived_at=NOW()
            WHERE id=%s
        """, (reason, sid))

        msg = f"Тренер {trainer_name} перевёл ученика «{student_name}» в архив. Причина: {reason}"
        cur.execute(f"SELECT id FROM {S}.users WHERE role='admin'")
        for (admin_id,) in cur.fetchall():
            cur.execute(f"INSERT INTO {S}.notifications (user_id, type, message) VALUES (%s,'archive',%s)", (admin_id, msg))

        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Ученик перемещён в архив"})

    cur.close(); conn.close()
    return err("Method not allowed", 405)