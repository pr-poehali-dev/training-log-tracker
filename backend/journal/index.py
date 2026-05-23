import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
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

def get_user(cur, user_id):
    cur.execute("SELECT id, role FROM users WHERE id=%s", (user_id,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Журнал: посещения и оплаты. Тренер не может снять уже поставленную отметку."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    qs = event.get("queryStringParameters") or {}
    path = event.get("path", "/")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    if not user_id:
        return err("Не авторизован", 401)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SET search_path TO {SCHEMA}")
    user = get_user(cur, user_id)
    if not user:
        cur.close(); conn.close()
        return err("Пользователь не найден", 401)
    uid, role = user

    # ──── ATTENDANCE ────────────────────────────────────────────
    section = qs.get("section", "")
    if section == "attendance" or "/attendance" in path:

        if method == "GET":
            # ?month=2025-05 or ?date=2025-05-23
            month = qs.get("month")
            date  = qs.get("date")
            trainer_filter = qs.get("trainer_id") if role == "admin" else uid

            if date:
                sql = """
                    SELECT a.id, a.student_id, s.name, a.date, a.present, a.trainer_id
                    FROM attendance a JOIN students s ON s.id=a.student_id
                    WHERE a.date=%s AND s.trainer_id=%s
                    ORDER BY s.name
                """
                cur.execute(sql, (date, trainer_filter))
            elif month:
                sql = """
                    SELECT a.id, a.student_id, s.name, a.date, a.present, a.trainer_id
                    FROM attendance a JOIN students s ON s.id=a.student_id
                    WHERE to_char(a.date,'YYYY-MM')=%s AND s.trainer_id=%s
                    ORDER BY a.date, s.name
                """
                cur.execute(sql, (month, trainer_filter))
            else:
                cur.close(); conn.close()
                return err("Укажите date или month")

            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            cur.close(); conn.close()
            return ok(rows)

        if method == "POST":
            student_id = body.get("student_id")
            date       = body.get("date")
            present    = bool(body.get("present", True))

            if not student_id or not date:
                cur.close(); conn.close()
                return err("Нет student_id или date")

            # проверка: ученик принадлежит тренеру
            cur.execute("SELECT trainer_id FROM students WHERE id=%s", (student_id,))
            s = cur.fetchone()
            if not s or (role != "admin" and str(s[0]) != str(uid)):
                cur.close(); conn.close()
                return err("Нет прав", 403)

            # тренер не может снять уже поставленную отметку
            if role == "trainer":
                cur.execute("SELECT present FROM attendance WHERE student_id=%s AND date=%s", (student_id, date))
                existing = cur.fetchone()
                if existing and existing[0] and not present:
                    cur.close(); conn.close()
                    return err("Нельзя снять уже поставленное посещение", 403)

            cur.execute("""
                INSERT INTO attendance (student_id, trainer_id, date, present)
                VALUES (%s,%s,%s,%s)
                ON CONFLICT (student_id, date) DO UPDATE SET present=EXCLUDED.present
            """, (student_id, uid, date, present))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Сохранено"})

    # ──── PAYMENTS ────────────────────────────────────────────
    if section == "payments" or "/payments" in path:

        if method == "GET":
            month = qs.get("month")
            trainer_filter = qs.get("trainer_id") if role == "admin" else uid
            if not month:
                cur.close(); conn.close()
                return err("Укажите month")
            cur.execute("""
                SELECT p.id, p.student_id, s.name, p.month, p.paid, p.paid_at, p.trainer_id, s.fee
                FROM payments p JOIN students s ON s.id=p.student_id
                WHERE p.month=%s AND s.trainer_id=%s
                ORDER BY s.name
            """, (month, trainer_filter))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

            # также вернуть учеников без записи (не платили ещё)
            cur.execute("""
                SELECT s.id, s.name, s.fee FROM students s
                WHERE s.trainer_id=%s AND s.id NOT IN (
                    SELECT student_id FROM payments WHERE month=%s
                )
                ORDER BY s.name
            """, (trainer_filter, month))
            for r in cur.fetchall():
                rows.append({"student_id": r[0], "name": r[1], "fee": r[2], "month": month, "paid": False, "paid_at": None})

            rows.sort(key=lambda x: x["name"])
            cur.close(); conn.close()
            return ok(rows)

        if method == "POST":
            student_id = body.get("student_id")
            month      = body.get("month")
            paid       = bool(body.get("paid", True))

            if not student_id or not month:
                cur.close(); conn.close()
                return err("Нет student_id или month")

            cur.execute("SELECT trainer_id FROM students WHERE id=%s", (student_id,))
            s = cur.fetchone()
            if not s or (role != "admin" and str(s[0]) != str(uid)):
                cur.close(); conn.close()
                return err("Нет прав", 403)

            # тренер не может снять уже поставленную оплату
            if role == "trainer":
                cur.execute("SELECT paid FROM payments WHERE student_id=%s AND month=%s", (student_id, month))
                existing = cur.fetchone()
                if existing and existing[0] and not paid:
                    cur.close(); conn.close()
                    return err("Нельзя снять уже поставленную оплату", 403)

            paid_at = "NOW()" if paid else None
            cur.execute("""
                INSERT INTO payments (student_id, trainer_id, month, paid, paid_at)
                VALUES (%s,%s,%s,%s, %s)
                ON CONFLICT (student_id, month) DO UPDATE SET paid=EXCLUDED.paid, paid_at=CASE WHEN EXCLUDED.paid THEN NOW() ELSE NULL END
            """, (student_id, uid, month, paid, None))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Сохранено"})

    # ──── PERSONAL SESSIONS ────────────────────────────────────
    if section == "personal" or "/personal" in path:

        if method == "GET":
            month = qs.get("month")
            trainer_filter = qs.get("trainer_id") if role == "admin" else uid
            if not month:
                cur.close(); conn.close()
                return err("Укажите month")
            cur.execute("""
                SELECT ps.id, ps.student_id, s.name, ps.date, ps.duration, ps.cost, ps.paid, ps.note, ps.trainer_id
                FROM personal_sessions ps JOIN students s ON s.id=ps.student_id
                WHERE to_char(ps.date,'YYYY-MM')=%s AND ps.trainer_id=%s
                ORDER BY ps.date DESC
            """, (month, trainer_filter))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            cur.close(); conn.close()
            return ok(rows)

        if method == "POST":
            student_id = body.get("student_id")
            if not student_id:
                cur.close(); conn.close()
                return err("Нет student_id")
            cur.execute("SELECT trainer_id FROM students WHERE id=%s", (student_id,))
            s = cur.fetchone()
            if not s or (role != "admin" and str(s[0]) != str(uid)):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute("""
                INSERT INTO personal_sessions (student_id, trainer_id, date, duration, cost, paid, note)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (student_id, uid, body.get("date"), int(body.get("duration",60)),
                  int(body.get("cost",1500)), bool(body.get("paid",False)), body.get("note") or None))
            new_id = cur.fetchone()[0]
            conn.commit()
            cur.close(); conn.close()
            return ok({"id": new_id, "message": "Добавлено"})

        if method == "PUT":
            sid = qs.get("id")
            if not sid:
                cur.close(); conn.close()
                return err("Нет id")
            cur.execute("SELECT trainer_id FROM personal_sessions WHERE id=%s", (sid,))
            row = cur.fetchone()
            if not row or (role != "admin" and str(row[0]) != str(uid)):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute("""
                UPDATE personal_sessions SET date=%s, duration=%s, cost=%s, paid=%s, note=%s WHERE id=%s
            """, (body.get("date"), int(body.get("duration",60)), int(body.get("cost",1500)),
                  bool(body.get("paid",False)), body.get("note") or None, sid))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Обновлено"})

        if method == "DELETE":
            sid = qs.get("id")
            if not sid:
                cur.close(); conn.close()
                return err("Нет id")
            cur.execute("SELECT trainer_id FROM personal_sessions WHERE id=%s", (sid,))
            row = cur.fetchone()
            if not row or (role != "admin" and str(row[0]) != str(uid)):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute("DELETE FROM personal_sessions WHERE id=%s", (sid,))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Удалено"})

    # ──── NOTES ────────────────────────────────────────────────
    if section == "notes" or "/notes" in path:

        if method == "GET":
            cur.execute("SELECT id, title, body, tags, important, created_at FROM notes WHERE trainer_id=%s ORDER BY important DESC, created_at DESC", (uid,))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            cur.close(); conn.close()
            return ok(rows)

        if method == "POST":
            title = body.get("title","").strip()
            if not title:
                cur.close(); conn.close()
                return err("Нет заголовка")
            cur.execute("""
                INSERT INTO notes (trainer_id, title, body, tags, important)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (uid, title, body.get("body") or None, body.get("tags") or None, bool(body.get("important",False))))
            new_id = cur.fetchone()[0]
            conn.commit()
            cur.close(); conn.close()
            return ok({"id": new_id, "message": "Сохранено"})

        if method == "PUT":
            nid = qs.get("id")
            cur.execute("SELECT trainer_id FROM notes WHERE id=%s", (nid,))
            row = cur.fetchone()
            if not row or str(row[0]) != str(uid):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute("UPDATE notes SET title=%s, body=%s, tags=%s, important=%s WHERE id=%s",
                        (body.get("title"), body.get("body") or None, body.get("tags") or None, bool(body.get("important",False)), nid))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Обновлено"})

        if method == "DELETE":
            nid = qs.get("id")
            cur.execute("SELECT trainer_id FROM notes WHERE id=%s", (nid,))
            row = cur.fetchone()
            if not row or str(row[0]) != str(uid):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute("DELETE FROM notes WHERE id=%s", (nid,))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Удалено"})

    cur.close(); conn.close()
    return err("Not found", 404)