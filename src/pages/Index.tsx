import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import TrainerDashboard from "@/components/dashboard/TrainerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import OfflineBanner from "@/components/shared/OfflineBanner";
import InstallBanner from "@/components/shared/InstallBanner";

export interface AppUser {
  id: number;
  username: string;
  role: "admin" | "trainer";
  full_name: string;
  hall?: string;
  schedule?: string;
  can_edit_journal?: boolean;
}

export default function Index() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("iko_user");
    if (!stored) { window.location.href = "/login"; return; }
    try { setUser(JSON.parse(stored)); }
    catch { window.location.href = "/login"; }
  }, []);

  const logout = () => {
    localStorage.removeItem("iko_user");
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col font-golos" style={{ background: "hsl(0,0%,96%)" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-30 shadow-sm">

        {/* Красная полоса-баннер с логотипом названия */}
        <div className="flex items-center justify-between px-4 py-2" style={{ background: "hsl(0,72%,37%)" }}>
          <div className="flex items-center gap-3 flex-1">
            <img src="https://cdn.poehali.dev/files/1fec5d10-7a6f-474c-9ffc-803e6e256c69.png"
              alt="Эмблема" className="h-12 w-12 object-contain flex-shrink-0" />
            <img src="https://cdn.poehali.dev/files/933d3a2d-bfbc-4200-ba9a-8fb9c1df2b69.png"
              alt="Бранч Ли" className="h-10 object-contain flex-shrink-0 brightness-0 invert" />
          </div>

          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/20 text-white">ADMIN</span>
            )}
            <button onClick={() => setLogoutConfirm(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20">
              <Icon name="LogOut" size={15} />
            </button>
          </div>
        </div>

        {/* Белая строка с именем пользователя и подполосой IKO */}
        <div className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-2">
            <img src="https://cdn.poehali.dev/files/9f3aac7e-73f8-48db-bf91-16853e8555d1.png"
              alt="IKO" className="h-4 object-contain opacity-40" />
            <span className="text-[10px] text-gray-400 uppercase tracking-[2px] font-semibold font-oswald">
              Ростовская обл. · Киокушинкай · Журнал тренера
            </span>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-gray-700">{user.full_name}</div>
            <div className="text-[10px] text-gray-400">
              {user.role === "admin" ? "Администратор" : `Тренер${user.hall ? ` · ${user.hall}` : ""}${user.schedule ? ` · ${user.schedule}` : ""}`}
            </div>
          </div>
        </div>
      </header>

      <InstallBanner />
      <OfflineBanner />

      {/* CONTENT */}
      <main className="flex-1 w-full md:max-w-none max-w-2xl mx-auto">
        {user.role === "admin"
          ? <AdminDashboard user={user} />
          : <TrainerDashboard user={user} />}
      </main>

      <ConfirmDialog open={logoutConfirm} title="Выход" message="Выйти из системы?"
        onConfirm={logout} onCancel={() => setLogoutConfirm(false)} />
    </div>
  );
}