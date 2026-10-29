import json
import os
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def restore_student(cur, sid):
    cur.execute(f"SELECT id, name, trainer_id FROM {S}.students WHERE id=%s AND archived=TRUE", (sid,))
    row = cur.fetchone()
    if not row:
        return False
    cur.execute(f"""
        UPDATE {S}.students SET archived=FALSE, archive_reason=NULL, archived_at=NULL
        WHERE id=%s
    """, (sid,))
    cur.execute(f"""
        INSERT INTO {S}.student_events (student_id, trainer_id, student_name, event_type, event_date, reason)
        VALUES (%s,%s,%s,'joined',(NOW() AT TIME ZONE 'Europe/Moscow')::date,'Возвращён из архива')
    """, (row[0], row[2], row[1]))
    return True

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
        elif role == "supervisor":
            trainer_filter = qs.get("trainer_id")
            if not trainer_filter:
                cur.close(); conn.close()
                return err("Укажите trainer_id")
            cur.execute(f"""
                SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                JOIN {S}.users u ON u.id = s.trainer_id
                WHERE s.trainer_id=%s AND {archived_cond} ORDER BY s.name
            """, (trainer_filter,))
        else:
            cur.execute(f"""
                SELECT s.*, u.full_name as trainer_name FROM {S}.students s
                JOIN {S}.users u ON u.id = s.trainer_id
                WHERE s.trainer_id=%s AND {archived_cond} ORDER BY s.name
            """, (uid,))

        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        if show_archived and rows:
            cur.execute(f"SELECT student_id FROM {S}.restore_requests WHERE status='pending'")
            pending_ids = {r[0] for r in cur.fetchall()}
            for row in rows:
                row["restore_pending"] = row["id"] in pending_ids

        # Наблюдателю не показываем финансовые поля
        if role == "supervisor":
            hidden = ("fee", "annual_fee_number")
            rows = [{k: v for k, v in row.items() if k not in hidden} for row in rows]

        cur.close(); conn.close()
        return ok(rows)

    # Наблюдатель — только просмотр, изменения запрещены
    if role == "supervisor":
        cur.close(); conn.close()
        return err("Наблюдатель может только просматривать данные", 403)

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
               birthdate, insurance, insurance_to, has_sport, sport_schedule, team_level, vk_id,
               federation_contract)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at
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
            (body.get("vk_id") or "").strip() or None,
            bool(body.get("federation_contract", False)),
        ))
        row = cur.fetchone()
        cur.execute(f"""
            INSERT INTO {S}.student_events (student_id, trainer_id, student_name, event_type, event_date)
            VALUES (%s,%s,%s,'joined',(NOW() AT TIME ZONE 'Europe/Moscow')::date)
        """, (row[0], uid, name))
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
              has_sport=%s, sport_schedule=%s, team_level=%s, vk_id=%s,
              federation_contract=%s
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
            (body.get("vk_id") or "").strip() or None,
            bool(body.get("federation_contract", False)),
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

        if qs.get("permanent") == "1":
            if role != "admin":
                cur.close(); conn.close()
                return err("Удалять учеников навсегда может только администратор", 403)
            cur.execute(f"SELECT id, name, trainer_id, archived FROM {S}.students WHERE id=%s", (sid,))
            del_row = cur.fetchone()
            if not del_row:
                cur.close(); conn.close()
                return err("Ученик не найден", 404)
            if not del_row[3]:
                cur.execute(f"""
                    INSERT INTO {S}.student_events (student_id, trainer_id, student_name, event_type, event_date, reason)
                    VALUES (%s,%s,%s,'left',(NOW() AT TIME ZONE 'Europe/Moscow')::date,'Удалён администратором')
                """, (del_row[0], del_row[2], del_row[1]))
            cur.execute(f"DELETE FROM {S}.attendance WHERE student_id=%s", (sid,))
            cur.execute(f"DELETE FROM {S}.payments WHERE student_id=%s", (sid,))
            cur.execute(f"DELETE FROM {S}.personal_sessions WHERE student_id=%s", (sid,))
            cur.execute(f"DELETE FROM {S}.students WHERE id=%s", (sid,))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Ученик удалён"})

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

        cur.execute(f"""
            INSERT INTO {S}.student_events (student_id, trainer_id, student_name, event_type, event_date, reason)
            SELECT id, trainer_id, name, 'left', (NOW() AT TIME ZONE 'Europe/Moscow')::date, %s
            FROM {S}.students WHERE id=%s
        """, (reason, sid))

        msg = f"Тренер {trainer_name} перевёл ученика «{student_name}» в архив. Причина: {reason}"
        cur.execute(f"SELECT id FROM {S}.users WHERE role='admin'")
        for (admin_id,) in cur.fetchall():
            cur.execute(f"INSERT INTO {S}.notifications (user_id, type, message) VALUES (%s,'archive',%s)", (admin_id, msg))

        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Ученик перемещён в архив"})

    # PATCH — массовое переименование группы (?action=rename_group) или статус отпуска (?action=set_leave)
    if method == "PATCH":
        action = qs.get("action")
        if action == "rename_group":
            old_grp = (body.get("old_grp") or "").strip()
            new_grp = (body.get("new_grp") or "").strip()
            if not old_grp or not new_grp:
                cur.close(); conn.close()
                return err("Укажите старое и новое название группы")
            cur.execute(f"""
                UPDATE {S}.students SET grp=%s
                WHERE trainer_id=%s AND grp=%s AND archived=FALSE
            """, (new_grp, uid, old_grp))
            count = cur.rowcount
            conn.commit()
            cur.close(); conn.close()
            return ok({"updated": count, "message": f"Переименовано {count} учеников"})

        if action == "request_restore":
            sid = qs.get("id")
            if not sid:
                cur.close(); conn.close()
                return err("Нет id")
            cur.execute(f"SELECT id, name, trainer_id FROM {S}.students WHERE id=%s AND archived=TRUE", (sid,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return err("Ученик не найден в архиве", 404)
            if role != "admin" and str(row[2]) != str(uid):
                cur.close(); conn.close()
                return err("Нет прав", 403)
            cur.execute(f"SELECT id FROM {S}.restore_requests WHERE student_id=%s AND status='pending'", (sid,))
            if cur.fetchone():
                cur.close(); conn.close()
                return err("Запрос на возврат уже отправлен")
            cur.execute(f"INSERT INTO {S}.restore_requests (student_id, trainer_id) VALUES (%s,%s) RETURNING id", (sid, uid))
            req_id = cur.fetchone()[0]
            cur.execute(f"SELECT full_name FROM {S}.users WHERE id=%s", (uid,))
            trainer_name = (cur.fetchone() or ["?"])[0]
            msg = f"Тренер {trainer_name} просит вернуть из архива ученика «{row[1]}»"
            cur.execute(f"SELECT id FROM {S}.users WHERE role='admin'")
            for (admin_id,) in cur.fetchall():
                cur.execute(f"INSERT INTO {S}.notifications (user_id, type, message, ref_id) VALUES (%s,'restore_request',%s,%s)", (admin_id, msg, req_id))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Запрос отправлен администратору", "request_id": req_id})

        if action == "resolve_restore":
            if role != "admin":
                cur.close(); conn.close()
                return err("Обработать запрос может только администратор", 403)
            req_id = qs.get("id")
            approve = bool(body.get("approve"))
            if not req_id:
                cur.close(); conn.close()
                return err("Нет id")
            cur.execute(f"SELECT student_id, trainer_id, status FROM {S}.restore_requests WHERE id=%s", (req_id,))
            rq = cur.fetchone()
            if not rq:
                cur.close(); conn.close()
                return err("Запрос не найден", 404)
            if rq[2] != "pending":
                cur.close(); conn.close()
                return err("Запрос уже обработан")
            cur.execute(f"SELECT name FROM {S}.students WHERE id=%s", (rq[0],))
            st = cur.fetchone()
            student_name = st[0] if st else "?"
            if approve:
                restore_student(cur, rq[0])
            cur.execute(f"""
                UPDATE {S}.restore_requests SET status=%s, resolved_at=NOW(), resolved_by=%s
                WHERE student_id=%s AND status='pending'
            """, ("approved" if approve else "rejected", uid, rq[0]))
            result_msg = (f"Администратор вернул ученика «{student_name}» из архива" if approve
                          else f"Администратор отклонил возврат ученика «{student_name}» из архива")
            cur.execute(f"INSERT INTO {S}.notifications (user_id, type, message) VALUES (%s,'restore_result',%s)", (rq[1], result_msg))
            cur.execute(f"UPDATE {S}.notifications SET read=TRUE WHERE type='restore_request' AND ref_id=%s", (req_id,))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Ученик возвращён из архива" if approve else "Запрос отклонён"})

        if action == "restore":
            if role != "admin":
                cur.close(); conn.close()
                return err("Вернуть из архива может только администратор", 403)
            sid = qs.get("id")
            if not sid:
                cur.close(); conn.close()
                return err("Нет id")
            if not restore_student(cur, sid):
                cur.close(); conn.close()
                return err("Ученик не найден в архиве", 404)
            cur.execute(f"""
                UPDATE {S}.restore_requests SET status='approved', resolved_at=NOW(), resolved_by=%s
                WHERE student_id=%s AND status='pending'
            """, (uid, sid))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Ученик возвращён из архива"})

        if action == "set_leave":
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
            on_leave = bool(body.get("on_leave", False))
            leave_reason = (body.get("leave_reason") or "").strip() or None
            leave_until = body.get("leave_until") or None
            cur.execute(f"""
                UPDATE {S}.students SET on_leave=%s, leave_reason=%s, leave_until=%s
                WHERE id=%s
            """, (on_leave, leave_reason if on_leave else None, leave_until if on_leave else None, sid))
            conn.commit()
            cur.close(); conn.close()
            return ok({"message": "Отпуск включён" if on_leave else "Отпуск отменён"})

    cur.close(); conn.close()
    return err("Method not allowed", 405)