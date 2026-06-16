import { useState, useEffect } from "react";
import { pushApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

type Status = "unknown" | "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("unknown");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
    );
  }, []);

  const subscribe = async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      if (!window.isSecureContext) {
        throw new Error("Уведомления работают только на установленном приложении или по HTTPS");
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }

      const { vapid_public } = await pushApi.getVapidKey();
      if (!vapid_public) throw new Error("VAPID ключ не настроен на сервере");

      const reg = await navigator.serviceWorker.ready;

      // если уже есть подписка — переиспользуем
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid_public),
        });
      }
      await pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON);
      setStatus("subscribed");
    } catch (e) {
      console.error(e);
      setErrMsg(e instanceof Error ? e.message : "Не удалось включить уведомления");
      setStatus("unsubscribed");
    }
  };

  const unsubscribe = async () => {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setStatus("subscribed");
    }
  };

  const sendTest = async () => {
    setTesting(true); setTestMsg("");
    try {
      await pushApi.test();
      setTestMsg("✓ Тест отправлен — проверьте уведомление");
    } catch (e: unknown) {
      setTestMsg(e instanceof Error ? e.message : "Ошибка");
    } finally { setTesting(false); }
  };

  if (status === "unsupported") return null;

  return (
    <div className="card-glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: status === "subscribed" ? "hsl(142,60%,93%)" : "hsl(0,0%,94%)" }}>
          <Icon name="Bell" size={18}
            style={{ color: status === "subscribed" ? "hsl(142,60%,35%)" : "#9ca3af" }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800">Push-уведомления</div>
          <div className="text-xs text-gray-400">
            {status === "subscribed"   && "Включены — напоминание придёт в 22:00"}
            {status === "unsubscribed" && "Выключены"}
            {status === "denied"       && "Заблокированы в браузере"}
            {status === "loading"      && "Загрузка..."}
          </div>
        </div>

        {status === "loading" && (
          <Icon name="Loader2" size={18} className="animate-spin text-gray-400" />
        )}
        {status === "subscribed" && (
          <button onClick={unsubscribe}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">
            Выкл.
          </button>
        )}
        {status === "unsubscribed" && (
          <button onClick={subscribe}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "hsl(0,72%,40%)" }}>
            Включить
          </button>
        )}
        {status === "denied" && (
          <span className="text-xs text-red-400">Разреши в браузере</span>
        )}
      </div>

      {errMsg && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 leading-snug">
          {errMsg}
        </div>
      )}

      {status === "subscribed" && (
        <div className="flex items-center gap-2">
          <button onClick={sendTest} disabled={testing}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
            <Icon name="Send" size={12} />
            {testing ? "Отправка..." : "Отправить тест"}
          </button>
          {testMsg && <span className="text-xs text-green-600">{testMsg}</span>}
        </div>
      )}
    </div>
  );
}