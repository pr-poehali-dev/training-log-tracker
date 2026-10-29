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
    """Отчёты. Тренер не видит выручку. Админ видит всё, включая сводку по всем тренерам."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    qs = event.get("queryStringParameters") or {}

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

    if role == "supervisor":
        cur.close(); conn.close()
        return err("Нет доступа к финансовым отчётам", 403)

    stats_year = qs.get("stats_year")
    if stats_year:
        if not stats_year.isdigit() or len(stats_year) != 4:
            cur.close(); conn.close()
            return err("Неверный год")
        stats_trainer = qs.get("trainer_id") if role == "admin" else str(uid)
        cond = "AND e.trainer_id=%s" if stats_trainer else ""
        params = [stats_year] + ([stats_trainer] if stats_trainer else [])
        cur.execute(f"""
            SELECT to_char(e.event_date,'MM') AS m, e.event_type, COUNT(*)
            FROM {S}.student_events e
            WHERE to_char(e.event_date,'YYYY')=%s {cond}
            GROUP BY 1,2
        """, params)
        months = {f"{i:02d}": {"month": f"{stats_year}-{i:02d}", "joined": 0, "left": 0} for i in range(1, 13)}
        for m, t, c in cur.fetchall():
            months[m][t] = int(c)

        by_trainer = []
        if role == "admin" and not stats_trainer:
            cur.execute(f"""
                SELECT u.id, u.full_name,
                       COUNT(*) FILTER (WHERE e.event_type='joined'),
                       COUNT(*) FILTER (WHERE e.event_type='left')
                FROM {S}.users u
                LEFT JOIN {S}.student_events e ON e.trainer_id=u.id AND to_char(e.event_date,'YYYY')=%s
                WHERE u.role='trainer'
                GROUP BY u.id, u.full_name ORDER BY u.full_name
            """, (stats_year,))
            by_trainer = [{"trainer_id": r[0], "trainer_name": r[1], "joined": int(r[2]), "left": int(r[3])} for r in cur.fetchall()]

        cur.close(); conn.close()
        rows = list(months.values())
        return ok({
            "year": stats_year,
            "months": rows,
            "total_joined": sum(r["joined"] for r in rows),
            "total_left": sum(r["left"] for r in rows),
            "by_trainer": by_trainer,
        })

    stats_month = qs.get("stats_month")
    if stats_month:
        stats_trainer = qs.get("trainer_id") if role == "admin" else str(uid)
        cond = "AND e.trainer_id=%s" if stats_trainer else ""
        params = [stats_month] + ([stats_trainer] if stats_trainer else [])
        cur.execute(f"""
            SELECT e.event_type, e.student_name, e.event_date, e.reason, u.full_name
            FROM {S}.student_events e
            LEFT JOIN {S}.users u ON u.id=e.trainer_id
            WHERE to_char(e.event_date,'YYYY-MM')=%s {cond}
            ORDER BY e.event_date, e.student_name
        """, params)
        events = [{"type": r[0], "name": r[1], "date": r[2], "reason": r[3], "trainer_name": r[4]} for r in cur.fetchall()]

        by_trainer = []
        if role == "admin" and not stats_trainer:
            cur.execute(f"""
                SELECT u.id, u.full_name,
                       COUNT(*) FILTER (WHERE e.event_type='joined'),
                       COUNT(*) FILTER (WHERE e.event_type='left')
                FROM {S}.users u
                LEFT JOIN {S}.student_events e ON e.trainer_id=u.id AND to_char(e.event_date,'YYYY-MM')=%s
                WHERE u.role='trainer'
                GROUP BY u.id, u.full_name ORDER BY u.full_name
            """, (stats_month,))
            by_trainer = [{"trainer_id": r[0], "trainer_name": r[1], "joined": int(r[2]), "left": int(r[3])} for r in cur.fetchall()]

        cur.close(); conn.close()
        return ok({
            "month": stats_month,
            "joined": sum(1 for e in events if e["type"] == "joined"),
            "left": sum(1 for e in events if e["type"] == "left"),
            "events": events,
            "by_trainer": by_trainer,
        })

    month = qs.get("month")
    if not month:
        cur.close(); conn.close()
        return err("Укажите month")

    trainer_id_param = qs.get("trainer_id") if role == "admin" else str(uid)
    all_trainers = (role == "admin" and not trainer_id_param)

    students = []
    if not all_trainers:
        trainer_filter = trainer_id_param if trainer_id_param else uid
        cur.execute(f"""
            SELECT
                s.id, s.name, s.hall, s.hall2, s.grp, s.fee, s.schedule,
                s.birthdate, s.insurance, s.insurance_to, s.cert_to, s.created_at,
                s.has_sport, s.sport_schedule, s.team_level, s.phone,
                s.on_leave, s.leave_reason, s.leave_until,
                COALESCE(p.paid, FALSE) as paid,
                COUNT(DISTINCT CASE WHEN a.present AND (COALESCE(a.group_type,'main')='main') THEN a.date END) as present_count,
                COUNT(DISTINCT CASE WHEN COALESCE(a.group_type,'main')='main' THEN a.date END) as total_days,
                COUNT(DISTINCT CASE WHEN a.present AND a.group_type='sport' THEN a.date END) as present_sport,
                COUNT(DISTINCT ps.id) as personal_count,
                COALESCE((SELECT SUM(ps2.cost) FROM {S}.personal_sessions ps2
                          WHERE ps2.student_id=s.id AND ps2.paid AND to_char(ps2.date,'YYYY-MM')=%s), 0) as personal_revenue,
                u.full_name as trainer_name,
                u.trainings_per_month
            FROM {S}.students s
            LEFT JOIN {S}.payments p ON p.student_id=s.id AND p.month=%s
            LEFT JOIN {S}.attendance a ON a.student_id=s.id AND to_char(a.date,'YYYY-MM')=%s
            LEFT JOIN {S}.personal_sessions ps ON ps.student_id=s.id AND to_char(ps.date,'YYYY-MM')=%s
            JOIN {S}.users u ON u.id=s.trainer_id
            WHERE s.trainer_id=%s AND s.archived=FALSE
            GROUP BY s.id, s.name, s.hall, s.hall2, s.grp, s.fee, s.schedule,
                     s.birthdate, s.insurance, s.insurance_to, s.cert_to, s.created_at,
                     s.has_sport, s.sport_schedule, s.team_level, s.phone,
                     p.paid, u.full_name, u.trainings_per_month
            ORDER BY s.name
        """, (month, month, month, month, trainer_filter))

        cols = [d[0] for d in cur.description]
        for r in cur.fetchall():
            row = dict(zip(cols, r))
            row["paid"] = bool(row["paid"])
            row["on_leave"] = bool(row["on_leave"])
            tpm = int(row.get("trainings_per_month") or 13)
            present = int(row["present_count"])
            row["attendance_rate"] = min(100, round(present / tpm * 100)) if tpm else 0
            row["trainings_per_month"] = tpm
            students.append(row)

    # Ученики "в отпуске" не учитываются в финансовом отчёте (не считаются должниками)
    billable_students = [s for s in students if not s["on_leave"]]
    subs_revenue = sum(s["fee"] for s in billable_students if s["paid"])
    pers_revenue = sum(int(s["personal_revenue"]) for s in students)
    total_students = len(billable_students)
    paid_count = sum(1 for s in billable_students if s["paid"])

    summary = {
        "month": month,
        "total_students": total_students,
        "paid_count": paid_count,
        "unpaid_count": total_students - paid_count,
    }
    if role == "admin":
        summary["subs_revenue"] = subs_revenue
        summary["pers_revenue"] = pers_revenue
        summary["total_revenue"] = subs_revenue + pers_revenue

    # Сводка по всем тренерам — всегда считаем для админа
    trainers_summary = []
    if role == "admin":
        cur.execute(f"""
            SELECT
                u.id, u.full_name, u.hall,
                COUNT(DISTINCT s.id) as student_count,
                COUNT(DISTINCT CASE WHEN p.paid THEN s.id END) as paid_count,
                COALESCE(SUM(CASE WHEN p.paid THEN s.fee ELSE 0 END), 0) as subs_rev,
                COALESCE((SELECT SUM(ps2.cost) FROM {S}.personal_sessions ps2
                          JOIN {S}.students s2 ON s2.id=ps2.student_id
                          WHERE s2.trainer_id=u.id AND ps2.paid AND to_char(ps2.date,'YYYY-MM')=%s), 0) as pers_rev
            FROM {S}.users u
            LEFT JOIN {S}.students s ON s.trainer_id=u.id AND s.archived=FALSE AND s.on_leave=FALSE
            LEFT JOIN {S}.payments p ON p.student_id=s.id AND p.month=%s
            WHERE u.role='trainer'
            GROUP BY u.id, u.full_name, u.hall
            ORDER BY u.full_name
        """, (month, month))
        t_cols = [d[0] for d in cur.description]
        total_subs = 0
        total_pers = 0
        for r in cur.fetchall():
            t = dict(zip(t_cols, r))
            t["total_rev"] = int(t["subs_rev"]) + int(t["pers_rev"])
            t["subs_rev"] = int(t["subs_rev"])
            t["pers_rev"] = int(t["pers_rev"])
            t["paid_count"] = int(t["paid_count"])
            total_subs += t["subs_rev"]
            total_pers += t["pers_rev"]
            trainers_summary.append(t)

        # При "все тренеры" summary считается из сводки
        if all_trainers:
            summary["subs_revenue"] = total_subs
            summary["pers_revenue"] = total_pers
            summary["total_revenue"] = total_subs + total_pers
            summary["total_students"] = sum(int(t["student_count"]) for t in trainers_summary)
            summary["paid_count"] = sum(int(t["paid_count"]) for t in trainers_summary)
            summary["unpaid_count"] = summary["total_students"] - summary["paid_count"]

    cur.close(); conn.close()
    return ok({
        "summary": summary,
        "students": students,
        "trainers": trainers_summary,
    })