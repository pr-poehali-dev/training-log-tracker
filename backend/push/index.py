import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC  = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = "mailto:admin@iko-journal.ru"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def send_push(subscription_info: dict, title: str, body: str, url: str = "/") -> bool:
    """Отправляет Web Push уведомление через pywebpush."""
    try:
        from pywebpush import webpush, WebPushException
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
    """Web Push: подписка, отписка, тест, cron-рассылка в 22:00."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")
    action = qs.get("action", "")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # Публичный ключ — не требует авторизации
    if method == "GET" and action == "vapid_public":
        return ok({"vapid_public": VAPID_PUBLIC})

    # Cron 21:30 МСК — напоминание тренерам о незаполненном журнале
    if method == "POST" and action in ("cron_remind", "cron_remind_trainers"):
        secret = qs.get("secret") or body.get("secret", "")
        if secret != os.environ.get("CRON_SECRET", ""):
            return err("Forbidden", 403)
        return _cron_remind_trainers()

    # Далее нужна авторизация
    if not user_id:
        return err("Не авторизован", 401)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id, role, full_name FROM {S}.users WHERE id=%s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return err("Пользователь не найден", 401)
    uid, role, full_name = user

    # Сохранить подписку
    if method == "POST" and action == "subscribe":
        sub = body.get("subscription", {})
        endpoint = sub.get("endpoint", "")
        keys = sub.get("keys", {})
        p256dh = keys.get("p256dh", "")
        auth = keys.get("auth", "")
        if not endpoint or not p256dh or not auth:
            cur.close(); conn.close()
            return err("Неверная подписка")
        cur.execute(f"""
            INSERT INTO {S}.push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (endpoint) DO UPDATE SET user_id=%s, p256dh=%s, auth=%s
        """, (uid, endpoint, p256dh, auth, uid, p256dh, auth))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Подписка сохранена"})

    # Удалить подписку
    if method == "POST" and action == "unsubscribe":
        endpoint = body.get("endpoint", "")
        cur.execute(f"DELETE FROM {S}.push_subscriptions WHERE endpoint=%s AND user_id=%s", (endpoint, uid))
        conn.commit()
        cur.close(); conn.close()
        return ok({"message": "Отписка выполнена"})

    # Тест-уведомление
    if method == "POST" and action == "test":
        cur.execute(f"SELECT endpoint, p256dh, auth FROM {S}.push_subscriptions WHERE user_id=%s", (uid,))
        subs = cur.fetchall()
        cur.close(); conn.close()
        if not subs:
            return err("Нет подписок — включите уведомления в браузере")
        sent = 0
        for (endpoint, p256dh, auth_key) in subs:
            sub_info = {"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth_key}}
            if send_push(sub_info, "🥋 ИКО Журнал", "Тест уведомлений работает!", "/"):
                sent += 1
        return ok({"sent": sent})

    cur.close(); conn.close()
    return err("Неверный action", 400)


def _cron_remind_trainers():
    """
    Cron 21:30 МСК (18:30 UTC): отправляем push тренерам, которые ещё не
    заполнили журнал посещаемости за сегодня.
    """
    now_msk = datetime.now(timezone(timedelta(hours=3)))
    today = now_msk.strftime("%Y-%m-%d")

    conn = get_conn()
    cur = conn.cursor()

    # Тренеры с активными учениками, но без отметок за сегодня
    cur.execute(f"""
        SELECT DISTINCT u.id, u.full_name
        FROM {S}.users u
        JOIN {S}.students s ON s.trainer_id = u.id AND s.archived = FALSE
        WHERE u.role = 'trainer'
          AND u.id NOT IN (
              SELECT DISTINCT trainer_id FROM {S}.attendance WHERE date = %s
          )
    """, (today,))
    trainers = cur.fetchall()

    sent_total = 0
    dead_endpoints = []

    for (trainer_id, trainer_name) in trainers:
        cur.execute(f"""
            SELECT endpoint, p256dh, auth FROM {S}.push_subscriptions WHERE user_id = %s
        """, (trainer_id,))
        subs = cur.fetchall()
        for (endpoint, p256dh, auth_key) in subs:
            sub_info = {"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth_key}}
            first_name = trainer_name.split()[0] if trainer_name else "Тренер"
            if send_push(
                sub_info,
                "🥋 Журнал не заполнен",
                f"{first_name}, не забудьте отметить посещаемость сегодня!",
                "/"
            ):
                sent_total += 1
            else:
                dead_endpoints.append(endpoint)

    # Удаляем только мёртвые endpoint-ы, не трогая другие подписки пользователя
    for ep in dead_endpoints:
        cur.execute(f"DELETE FROM {S}.push_subscriptions WHERE endpoint = %s", (ep,))

    conn.commit()
    cur.close()
    conn.close()
    return ok({"date": today, "reminded": len(trainers), "sent": sent_total})