import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/store/useStore";
import StudentsSection from "@/components/sections/StudentsSection";
import PaymentsSection from "@/components/sections/PaymentsSection";
import AttendanceSection from "@/components/sections/AttendanceSection";
import PersonalSection from "@/components/sections/PersonalSection";
import NotesSection from "@/components/sections/NotesSection";
import ReportsSection from "@/components/sections/ReportsSection";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

type Tab = "students" | "payments" | "attendance" | "personal" | "notes" | "reports";

const tabs: { id: Tab; label: string; short: string; icon: string }[] = [
  { id: "students",   label: "Ученики",      short: "Ученики",  icon: "BookOpen" },
  { id: "payments",   label: "Оплаты",       short: "Оплаты",   icon: "CreditCard" },
  { id: "attendance", label: "Посещения",    short: "Посещ.",   icon: "CalendarCheck" },
  { id: "personal",   label: "Персональные", short: "Перс.",    icon: "User" },
  { id: "notes",      label: "Заметки",      short: "Заметки",  icon: "FileText" },
  { id: "reports",    label: "Отчёты",       short: "Отчёты",   icon: "BarChart3" },
];

export default function Index() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("students");
  const [resetConfirm, setResetConfirm] = useState(false);

  const renderSection = () => {
    switch (tab) {
      case "students":   return <StudentsSection store={store} />;
      case "payments":   return <PaymentsSection store={store} />;
      case "attendance": return <AttendanceSection store={store} />;
      case "personal":   return <PersonalSection store={store} />;
      case "notes":      return <NotesSection store={store} />;
      case "reports":    return <ReportsSection store={store} />;
    }
  };

  const unpaidCount  = store.students.filter(s => !store.isPaid(s.id, store.currentMon)).length;
  const expiredCerts = store.students.filter(s => s.cert && s.ce && s.ce < store.today).length;

  return (
    <div className="min-h-screen flex flex-col font-golos" style={{ background: "hsl(0,0%,96%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

        {/* Top row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Round emblem */}
            <img
              src="https://cdn.poehali.dev/files/1fec5d10-7a6f-474c-9ffc-803e6e256c69.png"
              alt="Эмблема"
              className="h-12 w-12 object-contain flex-shrink-0"
            />
            {/* Branch-Li wordmark */}
            <img
              src="https://cdn.poehali.dev/files/933d3a2d-bfbc-4200-ba9a-8fb9c1df2b69.png"
              alt="Бранч Ли"
              className="h-8 object-contain flex-shrink-0"
            />
          </div>

          <div className="flex items-center gap-2">
            {unpaidCount > 0 && (
              <span className="badge-overdue text-[10px]">{unpaidCount} долг</span>
            )}
            {expiredCerts > 0 && (
              <span className="badge-absent text-[10px]">{expiredCerts} справ.</span>
            )}
            <button
              onClick={() => setResetConfirm(true)}
              title="Сбросить данные"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 bg-gray-50 hover:bg-gray-100"
            >
              <Icon name="RotateCcw" size={15} />
            </button>
          </div>
        </div>

        {/* Red strip */}
        <div
          className="flex items-center justify-center gap-3 px-4 py-1.5"
          style={{ background: "hsl(0,72%,37%)" }}
        >
          <img
            src="https://cdn.poehali.dev/files/9f3aac7e-73f8-48db-bf91-16853e8555d1.png"
            alt="IKO kanji"
            className="h-6 object-contain brightness-0 invert opacity-90"
          />
          <span className="text-[10px] text-red-100/80 uppercase tracking-[2px] font-semibold font-oswald">
            Ростовская обл. · Кюокушинкай · Журнал тренера
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 px-4 py-4 pb-24 max-w-2xl mx-auto w-full animate-fade-in">
        {renderSection()}
      </main>

      {/* BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-white border-t border-gray-200"
        style={{
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
          minHeight: 60,
        }}
      >
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-150"
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
                style={{
                  background: active ? "hsl(0,72%,96%)" : "transparent",
                  color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)",
                  transform: active ? "scale(1.1)" : "scale(1)",
                }}
              >
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
              </div>
              <span
                className="text-[9px] uppercase tracking-wide font-semibold"
                style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)" }}
              >
                {t.short}
              </span>
            </button>
          );
        })}
      </nav>

      <ConfirmDialog
        open={resetConfirm}
        title="Сбросить данные"
        message="Вернуть демо-данные? Все изменения будут потеряны."
        onConfirm={() => { store.reset(); setResetConfirm(false); }}
        onCancel={() => setResetConfirm(false)}
        danger
      />
    </div>
  );
}
