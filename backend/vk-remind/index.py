import json
import os
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime, timezone, timedelta
import calendar

S = os.environ.get("MAIN_DB_SCHEMA", "t_p10685360_training_log_tracker")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}
VK_API_VERSION = "5.199"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def send_vk_message(vk_id: str, text: str) -> bool:
    """Отправляет сообщение от имени сообщества ВК конкретному пользователю."""
    token = os.environ.get("VK_COMMUNITY_TOKEN", "")
    if not token:
        print("VK_COMMUNITY_TOKEN не задан")
        return False
    params = {
        "user_id": vk_id,
        "message": text,
        "random_id": int(datetime.now().timestamp() * 1000) % 2147483647,
        "access_token": token,
        "v": VK_API_VERSION,
    }
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request("https://api.vk.com/method/messages.send", data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            if "error" in result:
                print(f"VK error: {result['error']}")
                return False
            return True
    except Exception as e:
        print(f"VK send error: {e}")
        return False


def handler(event: dict, context) -> dict:
    """Напоминание ученикам-должникам об оплате через сообщения сообщества ВК. Cron в последний день месяца, либо ручной запуск admin'ом (action=run_now)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = qs.get("action", "")

    # Ручной запуск администратором из приложения
    if method == "POST" and action == "run_now":
        user_id = headers.get("X-User-Id") or headers.get("x-user-id")
        if not user_id:
            return err("Не авторизован", 401)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT role FROM {S}.users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row or row[0] != "admin":
            return err("Только администратор может запускать рассылку", 403)
        result = _remind_debtors(force=True)
        return ok(result)

    # Cron — защищён секретом
    if method == "POST" and action == "cron":
        secret = qs.get("secret") or body.get("secret", "")
        if secret != os.environ.get("CRON_SECRET", ""):
            return err("Forbidden", 403)
        result = _remind_debtors(force=False)
        return ok(result)

    return err("Неверный action", 400)


def _remind_debtors(force: bool):
    now_msk = datetime.now(timezone(timedelta(hours=3)))
    month = now_msk.strftime("%Y-%m")

    # Проверяем, что сегодня последний день месяца (иначе просто выходим — cron дёргается каждый день)
    last_day = calendar.monthrange(now_msk.year, now_msk.month)[1]
    if not force and now_msk.day != last_day:
        return {"skipped": True, "reason": "not_last_day", "date": now_msk.strftime("%Y-%m-%d")}

    conn = get_conn()
    cur = conn.cursor()

    # Должники: активные ученики с vk_id, не в отпуске, без оплаты за текущий месяц
    cur.execute(f"""
        SELECT s.id, s.name, s.vk_id, s.fee, u.full_name as trainer_name
        FROM {S}.students s
        JOIN {S}.users u ON u.id = s.trainer_id
        WHERE s.archived = FALSE AND s.on_leave = FALSE
          AND s.vk_id IS NOT NULL AND s.vk_id <> ''
          AND s.id NOT IN (
              SELECT student_id FROM {S}.payments WHERE month = %s AND paid = TRUE
          )
        ORDER BY s.name
    """, (month,))
    debtors = cur.fetchall()

    sent = 0
    failed = 0
    results = []
    for (sid, name, vk_id, fee, trainer_name) in debtors:
        text = (
            f"Здравствуйте! Напоминаем, что абонемент за {now_msk.strftime('%m.%Y')} "
            f"на сумму {fee} ₽ ещё не оплачен. Пожалуйста, свяжитесь с тренером "
            f"{trainer_name} для оплаты. Спасибо!"
        )
        success = send_vk_message(vk_id, text)
        if success:
            sent += 1
        else:
            failed += 1
        results.append({"student_id": sid, "name": name, "sent": success})

    cur.close()
    conn.close()

    return {
        "month": month,
        "date": now_msk.strftime("%Y-%m-%d"),
        "total_debtors_with_vk": len(debtors),
        "sent": sent,
        "failed": failed,
        "details": results,
    }
