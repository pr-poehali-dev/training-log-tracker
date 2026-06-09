import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}
VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = "mailto:admin@iko-journal.ru"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def send_push(subscription_info: dict, title: str, body: str, url: str = "/") -> bool:
    try:
        from pywebpush import webpush
        data = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info=subscription_info,
            data=data,
            vapid_private_key=VAPID_PRIVATE,
            vapid_claims={"sub": VAPID_SUBJECT},
        )
        return True
    except Exception as e:
        print(f"Push error: {e}")
        return False


def handler(event: dict, context) -> dict:
    """Ежедневный отчёт администратору в 22:00 МСК: кто из тренеров заполнил журнал, а кто нет."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    body_raw = event.get("body") or "{}"
    body = json.loads(body_raw)

    secret = qs.get("secret") or body.get("secret", "")
    if secret != os.environ.get("CRON_SECRET", ""):
        return err("Forbidden", 403)

    now_msk = datetime.now(timezone(timedelta(hours=3)))
    today = now_msk.strftime("%Y-%m-%d")

    conn = get_conn()
    cur = conn.cursor()

    # Все активные тренеры у которых есть хоть один ученик
    cur.execute(f"""
        SELECT DISTINCT u.id, u.full_name
        FROM {S}.users u
        JOIN {S}.students s ON s.trainer_id = u.id AND s.archived = FALSE
        WHERE u.role = 'trainer'
        ORDER BY u.full_name
    """)
    all_trainers = cur.fetchall()

    # Тренеры, которые заполнили журнал сегодня (есть хоть одна отметка)
    cur.execute(f"""
        SELECT DISTINCT trainer_id
        FROM {S}.attendance
        WHERE date = %s
    """, (today,))
    filled_ids = {row[0] for row in cur.fetchall()}

    filled = [(tid, name) for tid, name in all_trainers if tid in filled_ids]
    not_filled = [(tid, name) for tid, name in all_trainers if tid not in filled_ids]

    # Формируем текст сводки
    filled_names = ", ".join(name.split()[0] for _, name in filled) if filled else "никто"
    not_filled_names = ", ".join(name.split()[0] for _, name in not_filled) if not_filled else "все заполнили"

    title = f"📋 Журнал за {now_msk.strftime('%d.%m')}"
    body_text = ""
    if filled:
        body_text += f"✅ Заполнили: {filled_names}"
    if not_filled:
        if body_text:
            body_text += f"\n❌ Не заполнили: {not_filled_names}"
        else:
            body_text = f"❌ Не заполнили: {not_filled_names}"

    # Получаем push-подписки всех администраторов
    cur.execute(f"""
        SELECT ps.endpoint, ps.p256dh, ps.auth
        FROM {S}.push_subscriptions ps
        JOIN {S}.users u ON u.id = ps.user_id
        WHERE u.role = 'admin'
    """)
    admin_subs = cur.fetchall()

    sent = 0
    dead_endpoints = []
    for (endpoint, p256dh, auth_key) in admin_subs:
        sub_info = {"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth_key}}
        if send_push(sub_info, title, body_text, "/"):
            sent += 1
        else:
            dead_endpoints.append(endpoint)

    # Чистим мёртвые подписки
    for ep in dead_endpoints:
        cur.execute(f"DELETE FROM {S}.push_subscriptions WHERE endpoint = %s", (ep,))

    conn.commit()
    cur.close()
    conn.close()

    return ok({
        "date": today,
        "filled": [name for _, name in filled],
        "not_filled": [name for _, name in not_filled],
        "admins_notified": sent,
    })
