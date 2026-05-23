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
  { id: "students", label: "Ученики", short: "Ученики", icon: "BookOpen" },
  { id: "payments", label: "Оплаты", short: "Оплаты", icon: "CreditCard" },
  { id: "attendance", label: "Посещения", short: "Посещ.", icon: "CalendarCheck" },
  { id: "personal", label: "Персональные", short: "Перс.", icon: "User" },
  { id: "notes", label: "Заметки", short: "Заметки", icon: "FileText" },
  { id: "reports", label: "Отчёты", short: "Отчёты", icon: "BarChart3" },
];

export default function Index() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("students");
  const [resetConfirm, setResetConfirm] = useState(false);

  const renderSection = () => {
    switch (tab) {
      case "students": return <StudentsSection store={store} />;
      case "payments": return <PaymentsSection store={store} />;
      case "attendance": return <AttendanceSection store={store} />;
      case "personal": return <PersonalSection store={store} />;
      case "notes": return <NotesSection store={store} />;
      case "reports": return <ReportsSection store={store} />;
    }
  };

  const unpaidCount = store.students.filter(s => !store.isPaid(s.id, store.currentMon)).length;
  const expiredCerts = store.students.filter(s => s.cert && s.ce && s.ce < store.today).length;

  return (
    <div className="min-h-screen flex flex-col font-golos" style={{ background: "hsl(220,20%,5%)" }}>
      {/* Header */}
      <header style={{ background: "hsla(220,18%,8%,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(220,15%,15%)" }}
        className="sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "hsl(0,72%,20%)", border: "1px solid hsl(0,72%,35%)" }}>
              🥋
            </div>
            <div>
              <div className="font-oswald text-base font-bold tracking-widest" style={{ color: "hsl(0,72%,62%)" }}>IKO ЖУРНАЛ</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Ростовская обл.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unpaidCount > 0 && (
              <span className="badge-overdue text-[10px]">{unpaidCount} долг</span>
            )}
            {expiredCerts > 0 && (
              <span className="badge-absent text-[10px]">{expiredCerts} справ.</span>
            )}
            <button onClick={() => setResetConfirm(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(220,15%,14%)", border: "1px solid hsl(220,15%,20%)" }}>
              <Icon name="RotateCcw" size={15} />
            </button>
          </div>
        </div>

        {/* Red strip */}
        <div className="h-7 flex items-center justify-center px-4" style={{ background: "hsl(0,72%,28%)" }}>
          <span className="text-[10px] text-red-200/70 uppercase tracking-[2px] font-semibold font-oswald">
            Физкультурно-спортивная федерация · Кюокушинкай
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24 max-w-2xl mx-auto w-full animate-fade-in">
        {renderSection()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
        style={{ background: "hsla(220,18%,8%,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid hsl(220,15%,15%)", paddingBottom: "env(safe-area-inset-bottom,0px)", minHeight: 60 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-200"
              style={{ color: active ? "hsl(0,72%,62%)" : "hsl(215,20%,50%)" }}>
              <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${active ? "scale-110" : ""}`}
                style={{ background: active ? "hsla(0,72%,58%,0.15)" : "transparent" }}>
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
              </div>
              <span className="text-[9px] uppercase tracking-wide font-semibold">{t.short}</span>
            </button>
          );
        })}
      </nav>

      <ConfirmDialog open={resetConfirm} title="Сбросить данные" message="Вернуть демо-данные? Все изменения будут потеряны."
        onConfirm={() => { store.reset(); setResetConfirm(false); }}
        onCancel={() => setResetConfirm(false)}
        danger />
    </div>
  );
}
