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
  trainings_per_month?: number;
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
    <div className="min-h-screen flex flex-col font-golos" style={{ background: "hsl(0,0%,96%)", position: "relative" }}>
      {/* Рандомный фоновый паттерн */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[
          { top: "2%",  left: "6%",   rotate: -15, size: 90,  src: "https://cdn.poehali.dev/files/15c8c645-e1f6-48d4-87f2-db2f120f56ac.png" },
          { top: "6%",  left: "52%",  rotate: 30,  size: 110, src: "https://cdn.poehali.dev/files/07a4428b-e82e-4e59-bf03-14afa55514ae.png" },
          { top: "4%",  left: "80%",  rotate: -5,  size: 100, src: "https://cdn.poehali.dev/files/8f0cc038-087a-4a9d-b452-b476da31a2af.png" },
          { top: "15%", left: "28%",  rotate: 20,  size: 120, src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/324ac3ec-ce2f-4eeb-8c74-f449168be6de.jpg" },
          { top: "20%", left: "72%",  rotate: -35, size: 85,  src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/b2f614c0-1a35-403f-850a-c5b393010061.jpg" },
          { top: "30%", left: "4%",   rotate: 10,  size: 100, src: "https://cdn.poehali.dev/files/8f0cc038-087a-4a9d-b452-b476da31a2af.png" },
          { top: "33%", left: "44%",  rotate: -20, size: 90,  src: "https://cdn.poehali.dev/files/07a4428b-e82e-4e59-bf03-14afa55514ae.png" },
          { top: "36%", left: "86%",  rotate: 25,  size: 80,  src: "https://cdn.poehali.dev/files/15c8c645-e1f6-48d4-87f2-db2f120f56ac.png" },
          { top: "48%", left: "18%",  rotate: -8,  size: 110, src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/324ac3ec-ce2f-4eeb-8c74-f449168be6de.jpg" },
          { top: "50%", left: "62%",  rotate: 40,  size: 95,  src: "https://cdn.poehali.dev/files/15c8c645-e1f6-48d4-87f2-db2f120f56ac.png" },
          { top: "60%", left: "35%",  rotate: -30, size: 105, src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/b2f614c0-1a35-403f-850a-c5b393010061.jpg" },
          { top: "63%", left: "80%",  rotate: 12,  size: 90,  src: "https://cdn.poehali.dev/files/8f0cc038-087a-4a9d-b452-b476da31a2af.png" },
          { top: "70%", left: "2%",   rotate: 22,  size: 85,  src: "https://cdn.poehali.dev/files/07a4428b-e82e-4e59-bf03-14afa55514ae.png" },
          { top: "74%", left: "52%",  rotate: -18, size: 100, src: "https://cdn.poehali.dev/files/15c8c645-e1f6-48d4-87f2-db2f120f56ac.png" },
          { top: "80%", left: "24%",  rotate: 35,  size: 115, src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/324ac3ec-ce2f-4eeb-8c74-f449168be6de.jpg" },
          { top: "83%", left: "74%",  rotate: -10, size: 80,  src: "https://cdn.poehali.dev/files/8f0cc038-087a-4a9d-b452-b476da31a2af.png" },
          { top: "89%", left: "42%",  rotate: 15,  size: 70,  src: "https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/files/b2f614c0-1a35-403f-850a-c5b393010061.jpg" },
          { top: "92%", left: "88%",  rotate: -25, size: 95,  src: "https://cdn.poehali.dev/files/07a4428b-e82e-4e59-bf03-14afa55514ae.png" },
        ].map((item, i) => (
          <img key={i} src={item.src}
            alt="" style={{ position: "absolute", top: item.top, left: item.left, width: item.size, height: item.size, opacity: 0.06, transform: `rotate(${item.rotate}deg)`, objectFit: "contain" }} />
        ))}
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <img src="https://cdn.poehali.dev/files/1fec5d10-7a6f-474c-9ffc-803e6e256c69.png"
              alt="Эмблема" className="h-11 w-11 object-contain flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-700">{user.full_name}</div>
              <div className="text-[10px] text-gray-400">
                {user.role === "admin" ? "Администратор" : `Тренер${user.hall ? ` · ${user.hall}` : ""}${user.schedule ? ` · ${user.schedule}` : ""}`}
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
            Ростовская обл. · Киокушинкай · Журнал тренера
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
    </div>
  );
}