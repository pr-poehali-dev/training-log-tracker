import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { todayStr, monStr } from "./trainer-ui";
import { StudentsSection, PaymentsSection, AttendanceSection } from "./TrainerSections1";
import { PersonalSection, NotesSection, ReportsSection } from "./TrainerSections2";

type Tab = "students" | "payments" | "attendance" | "personal" | "notes" | "reports";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "students",   label: "Ученики", icon: "BookOpen" },
  { id: "payments",   label: "Оплаты",  icon: "CreditCard" },
  { id: "attendance", label: "Посещ.",  icon: "CalendarCheck" },
  { id: "personal",   label: "Перс.",   icon: "User" },
  { id: "notes",      label: "Заметки", icon: "FileText" },
  { id: "reports",    label: "Отчёты",  icon: "BarChart3" },
];

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());

  return (
    <div className="flex flex-col">
      {/* Date/Month pickers */}
      {(tab === "students" || tab === "attendance") && (
        <div className="px-4 pt-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1" /></div>
      )}
      {(tab === "payments" || tab === "personal" || tab === "reports") && (
        <div className="px-4 pt-3"><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1" /></div>
      )}

      <div className="px-4 py-3 pb-24">
        {tab === "students"   && <StudentsSection   user={user} date={date} month={month} />}
        {tab === "payments"   && <PaymentsSection   user={user} month={month} />}
        {tab === "attendance" && <AttendanceSection user={user} date={date} />}
        {tab === "personal"   && <PersonalSection   user={user} month={month} />}
        {tab === "notes"      && <NotesSection      user={user} />}
        {tab === "reports"    && <ReportsSection    user={user} month={month} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around" style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.07)", paddingBottom: "env(safe-area-inset-bottom,0px)", minHeight: 60 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg transition-all" style={{ background: active ? "hsl(0,72%,96%)" : "transparent", color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)", transform: active ? "scale(1.1)" : "scale(1)" }}>
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
              </div>
              <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)" }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
