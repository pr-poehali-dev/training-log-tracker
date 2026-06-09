import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppUser } from "@/pages/Index";
import { todayStr, monStr } from "./trainer-ui";
import { StudentsSection, PaymentsSection, AttendanceSection } from "./TrainerSections1";
import { PersonalSection, NotesSection, ReportsSection, ExpensesSection } from "./TrainerSections2";
import AppShell, { type Tab } from "@/components/layout/AppShell";
import Icon from "@/components/ui/icon";
import { attendanceApi, pushApi } from "@/lib/api";

function formatDateRu(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatMonthRu(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function PushPromoModal({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<"idle" | "denied" | "error" | "success">("idle");

  const enable = async () => {
    setLoading(true);
    try {
      const { vapid_public } = await pushApi.getVapidKey();
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        setState("denied");
        setLoading(false);
        return;
      }
      if (perm !== "granted") {
        setState("error");
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_public),
      });
      await pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON);
      setState("success");
      setTimeout(onDone, 1500);
    } catch {
      setState("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: state === "success" ? "hsl(142,60%,93%)" : "hsl(0,72%,95%)" }}>
            <Icon
              name={state === "success" ? "BellRing" : "BellRing"}
              size={28}
              style={{ color: state === "success" ? "hsl(142,60%,35%)" : "hsl(0,72%,40%)" }}
            />
          </div>
          <h2 className="font-oswald font-bold text-lg tracking-wide text-gray-800 mb-1">
            {state === "success" ? "Уведомления включены!" : "Включите уведомления"}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {state === "success"
              ? "Отлично! В 21:30 вы получите напоминание, если журнал не заполнен."
              : <>В <b>21:30</b> вам придёт напоминание, если журнал посещаемости ещё не заполнен — прямо поверх всех приложений.</>
            }
          </p>
        </div>

        {state === "denied" && (
          <div className="mx-5 mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 text-center leading-relaxed">
            Уведомления заблокированы в браузере.<br />
            Зайдите в настройки браузера → Уведомления и разрешите этот сайт.
          </div>
        )}
        {state === "error" && (
          <div className="mx-5 mb-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 text-center">
            Не удалось подключить уведомления. Попробуйте позже.
          </div>
        )}

        {state !== "success" && (
          <div className="flex flex-col gap-2 px-5 pb-5">
            <button
              onClick={enable}
              disabled={loading || state === "denied"}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "hsl(0,72%,40%)" }}>
              {loading ? "Подключение..." : "🔔 Включить уведомления"}
            </button>
            <button
              onClick={onDone}
              className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {state === "denied" ? "Закрыть" : "Не сейчас"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function useJournalReminder(user: AppUser) {
  const today = todayStr();
  const [dismissed, setDismissed] = useState(false);

  // Проверяем время — после 21:30 МСК (= 18:30 UTC)
  const isAfter2130msk = () => {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    return utcH > 18 || (utcH === 18 && utcM >= 30);
  };

  const [timeOk, setTimeOk] = useState(isAfter2130msk);

  useEffect(() => {
    if (timeOk) return;
    const check = setInterval(() => {
      if (isAfter2130msk()) { setTimeOk(true); clearInterval(check); }
    }, 60000);
    return () => clearInterval(check);
  }, [timeOk]);

  const { data: attData = [] } = useQuery({
    queryKey: ["att-date", today, user.id],
    queryFn: () => attendanceApi.byDate(today),
    enabled: timeOk && !dismissed,
    refetchInterval: timeOk && !dismissed ? 5 * 60 * 1000 : false,
  });

  const hasAttendance = (attData as Record<string, unknown>[]).some(a => a.present);
  const show = timeOk && !dismissed && !hasAttendance;

  return { show, dismiss: () => setDismissed(true) };
}

function usePushPromo() {
  const STORAGE_KEY = "push_promo_shown";
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Показываем через 3 секунды после входа — даём приложению загрузиться
    const timer = setTimeout(() => {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          if (!sub) setShow(true);
        })
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return { show, dismiss };
}

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());
  const { show: showReminder, dismiss: dismissReminder } = useJournalReminder(user);
  const { show: showPushPromo, dismiss: dismissPushPromo } = usePushPromo();

  const toolbar = (
    <>
      {tab === "students" && (
        <label className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer shadow-sm">
          <Icon name="CalendarDays" size={18} className="text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-700">{formatDateRu(date)}</span>
          <Icon name="ChevronDown" size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </label>
      )}
      {(tab === "payments" || tab === "personal" || tab === "reports" || tab === "attendance" || tab === "expenses") && (
        <label className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer shadow-sm">
          <Icon name="CalendarDays" size={18} className="text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-700">{formatMonthRu(month)}</span>
          <Icon name="ChevronDown" size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
          />
        </label>
      )}
    </>
  );

  return (
    <AppShell tab={tab} onTabChange={setTab} toolbar={toolbar}>
      {/* Промо-модалка включения пуш при первом входе */}
      {showPushPromo && <PushPromoModal onDone={dismissPushPromo} />}

      {/* Баннер-напоминание о незаполненном журнале после 21:30 */}
      {showReminder && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl shadow-xl overflow-hidden"
          style={{ background: "hsl(0,72%,38%)" }}>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <div className="text-xl flex-shrink-0 mt-0.5">🥋</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">Журнал не заполнен!</div>
              <div className="text-red-100 text-xs mt-0.5">Не забудьте отметить посещаемость за сегодня</div>
            </div>
            <button onClick={dismissReminder}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-red-200 hover:text-white transition-colors mt-0.5">
              <Icon name="X" size={16} />
            </button>
          </div>
          <button
            onClick={() => { dismissReminder(); setTab("students"); }}
            className="w-full py-2.5 text-xs font-bold text-white border-t border-red-500 hover:bg-red-700 transition-colors tracking-wide uppercase">
            Перейти к журналу →
          </button>
        </div>
      )}

      {tab === "students"   && <StudentsSection   user={user} date={date} month={month} />}
      {tab === "payments"   && <PaymentsSection   user={user} month={month} />}
      {tab === "attendance" && <AttendanceSection user={user} date={date} month={month} />}
      {tab === "personal"   && <PersonalSection   user={user} month={month} />}
      {tab === "notes"      && <NotesSection      user={user} />}
      {tab === "expenses"   && <ExpensesSection   user={user} month={month} />}
      {tab === "reports"    && <ReportsSection    user={user} month={month} />}
    </AppShell>
  );
}