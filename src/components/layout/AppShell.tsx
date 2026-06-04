import Icon from "@/components/ui/icon";

export type Tab = "students" | "payments" | "attendance" | "personal" | "notes" | "reports" | "expenses";

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "students",   label: "Ученики",   icon: "Users" },
  { id: "payments",   label: "Оплаты",    icon: "CircleDollarSign" },
  { id: "attendance", label: "Посещения", icon: "CalendarCheck" },
  { id: "personal",   label: "Персонал",  icon: "User" },
  { id: "expenses",   label: "Расходы",   icon: "Receipt" },
  { id: "notes",      label: "Заметки",   icon: "FileText" },
  { id: "reports",    label: "Отчёты",    icon: "BarChart2" },
];

interface AppShellProps {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}

export default function AppShell({ tab, onTabChange, children, toolbar }: AppShellProps) {
  return (
    <>
      {/* ── DESKTOP ── */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
          <nav className="flex flex-col gap-1 p-3 flex-1 mt-2">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => onTabChange(t.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                  style={{
                    background: active ? "hsl(0,72%,96%)" : "transparent",
                    color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,40%)",
                  }}>
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ background: active ? "hsl(0,72%,40%)" : "hsl(0,0%,94%)", color: active ? "#fff" : "hsl(0,0%,52%)" }}>
                    <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={15} />
                  </div>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {toolbar && <div className="px-6 pt-4">{toolbar}</div>}
          <div className="px-6 py-4 flex-1">{children}</div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="flex flex-col md:hidden">
        {toolbar && (
          <div className="relative px-4 pt-3">{toolbar}</div>
        )}
        <div className="px-4 py-3 pb-24">{children}</div>

        {/* Bottom nav — точь-в-точь по макету */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-stretch"
          style={{
            boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.05)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className="flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 gap-0.5 transition-all relative"
              >
                {/* Active indicator line top */}
                {active && (
                  <span className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: "hsl(0,72%,40%)" }} />
                )}
                <Icon
                  name={t.icon as Parameters<typeof Icon>[0]["name"]}
                  size={20}
                  style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,58%)" }}
                />
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide leading-none"
                  style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,58%)" }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}