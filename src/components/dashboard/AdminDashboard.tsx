import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import AdminTrainersTab from "./admin/AdminTrainersTab";
import AdminDataTab     from "./admin/AdminDataTab";
import AdminReportsTab  from "./admin/AdminReportsTab";

type Tab = "trainers" | "data" | "reports";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "trainers", label: "Тренеры", icon: "Users" },
  { id: "data",     label: "Данные",  icon: "Database" },
  { id: "reports",  label: "Отчёты",  icon: "BarChart3" },
];

export default function AdminDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("trainers");

  return (
    <div className="flex flex-col">
      {/* Вкладки */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 flex">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)",
                borderBottom: active ? "2px solid hsl(0,72%,40%)" : "2px solid transparent",
              }}>
              <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={17} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "trainers" && <AdminTrainersTab user={user} />}
      {tab === "data"     && <AdminDataTab />}
      {tab === "reports"  && <AdminReportsTab />}
    </div>
  );
}
