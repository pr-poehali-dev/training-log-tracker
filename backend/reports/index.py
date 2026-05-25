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
    """Отчёты. Тренер не видит выручку. Админ видит всё."""
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

    month = qs.get("month")
    if not month:
        cur.close(); conn.close()
        return err("Укажите month")

    trainer_filter = qs.get("trainer_id") if role == "admin" else uid

    cur.execute(f"""
        SELECT
            s.id, s.name, s.hall, s.grp, s.fee,
            COALESCE(p.paid, FALSE) as paid,
            COUNT(DISTINCT CASE WHEN a.present THEN a.date END) as present_count,
            COUNT(DISTINCT a.date) as total_days,
            COUNT(DISTINCT ps.id) as personal_count,
            COALESCE(SUM(CASE WHEN ps.paid THEN ps.cost ELSE 0 END), 0) as personal_revenue,
            u.full_name as trainer_name
        FROM {S}.students s
        LEFT JOIN {S}.payments p ON p.student_id=s.id AND p.month=%s
        LEFT JOIN {S}.attendance a ON a.student_id=s.id AND to_char(a.date,'YYYY-MM')=%s
        LEFT JOIN {S}.personal_sessions ps ON ps.student_id=s.id AND to_char(ps.date,'YYYY-MM')=%s
        JOIN {S}.users u ON u.id=s.trainer_id
        WHERE s.trainer_id=%s
        GROUP BY s.id, s.name, s.hall, s.grp, s.fee, p.paid, u.full_name
        ORDER BY s.name
    """, (month, month, month, trainer_filter))

    cols = [d[0] for d in cur.description]
    students = []
    for r in cur.fetchall():
        row = dict(zip(cols, r))
        row["paid"] = bool(row["paid"])
        row["attendance_rate"] = (
            round(int(row["present_count"]) / int(row["total_days"]) * 100)
            if int(row["total_days"]) else 0
        )
        students.append(row)

    subs_revenue = sum(s["fee"] for s in students if s["paid"])
    pers_revenue = sum(int(s["personal_revenue"]) for s in students)
    total_students = len(students)
    paid_count = sum(1 for s in students if s["paid"])

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

    trainers_summary = []
    if role == "admin" and not qs.get("trainer_id"):
        cur.execute(f"""
            SELECT
                u.id, u.full_name, u.hall,
                COUNT(DISTINCT s.id) as student_count,
                COALESCE(SUM(CASE WHEN p.paid THEN s.fee ELSE 0 END), 0) as subs_rev,
                COALESCE(SUM(CASE WHEN ps.paid THEN ps.cost ELSE 0 END), 0) as pers_rev
            FROM {S}.users u
            LEFT JOIN {S}.students s ON s.trainer_id=u.id
            LEFT JOIN {S}.payments p ON p.student_id=s.id AND p.month=%s
            LEFT JOIN {S}.personal_sessions ps ON ps.student_id=s.id AND to_char(ps.date,'YYYY-MM')=%s
            WHERE u.role='trainer'
            GROUP BY u.id, u.full_name, u.hall
            ORDER BY u.full_name
        """, (month, month))
        t_cols = [d[0] for d in cur.description]
        for r in cur.fetchall():
            t = dict(zip(t_cols, r))
            t["total_rev"] = int(t["subs_rev"]) + int(t["pers_rev"])
            t["subs_rev"] = int(t["subs_rev"])
            t["pers_rev"] = int(t["pers_rev"])
            trainers_summary.append(t)

    cur.close(); conn.close()
    return ok({
        "summary": summary,
        "students": students,
        "trainers": trainers_summary,
    })
