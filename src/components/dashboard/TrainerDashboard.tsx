import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppUser } from "@/pages/Index";
import { todayStr, monStr } from "./trainer-ui";
import { StudentsSection, PaymentsSection, AttendanceSection } from "./TrainerSections1";
import { PersonalSection, NotesSection, ReportsSection, ExpensesSection } from "./TrainerSections2";
import AppShell, { type Tab } from "@/components/layout/AppShell";
import Icon from "@/components/ui/icon";
import { attendanceApi } from "@/lib/api";

function formatDateRu(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatMonthRu(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
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

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());
  const { show: showReminder, dismiss: dismissReminder } = useJournalReminder(user);

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