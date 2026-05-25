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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <img src="https://cdn.poehali.dev/files/1fec5d10-7a6f-474c-9ffc-803e6e256c69.png"
              alt="Эмблема" className="h-11 w-11 object-contain flex-shrink-0" />
            <img src="https://cdn.poehali.dev/files/933d3a2d-bfbc-4200-ba9a-8fb9c1df2b69.png"
              alt="Бранч Ли" className="h-7 object-contain flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-700">{user.full_name}</div>
              <div className="text-[10px] text-gray-400">
                {user.role === "admin" ? "Администратор" : `Тренер${user.hall ? ` · ${user.hall}` : ""}`}
              </div>
            </div>
            {user.role === "admin" && (
              <span className="badge-overdue text-[10px] px-2 py-0.5">ADMIN</span>
            )}
            <button onClick={() => setLogoutConfirm(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 bg-gray-50 hover:bg-gray-100">
              <Icon name="LogOut" size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4 py-1.5" style={{ background: "hsl(0,72%,37%)" }}>
          <img src="https://cdn.poehali.dev/files/9f3aac7e-73f8-48db-bf91-16853e8555d1.png"
            alt="IKO" className="h-5 object-contain brightness-0 invert opacity-90" />
          <span className="text-[10px] text-red-100/80 uppercase tracking-[2px] font-semibold font-oswald">
            Ростовская обл. · Кюокушинкай · Журнал тренера
          </span>
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