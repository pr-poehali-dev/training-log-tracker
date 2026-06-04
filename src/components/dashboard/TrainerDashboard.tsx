import { useState } from "react";
import type { AppUser } from "@/pages/Index";
import { todayStr, monStr } from "./trainer-ui";
import { StudentsSection, PaymentsSection, AttendanceSection } from "./TrainerSections1";
import { PersonalSection, NotesSection, ReportsSection, ExpensesSection } from "./TrainerSections2";
import AppShell, { type Tab } from "@/components/layout/AppShell";
import Icon from "@/components/ui/icon";

function formatDateRu(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatMonthRu(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());

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