import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import TrainerDashboard from "@/components/dashboard/TrainerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import OfflineBanner from "@/components/shared/OfflineBanner";
import InstallBanner from "@/components/shared/InstallBanner";
import NotificationBell from "@/components/shared/NotificationBell";

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
      {/* Background karate hieroglyphs watermark */}
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

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          {/* Top bar: logo + title + icons */}
          <div className="flex items-center justify-between px-4 py-2.5">
            {/* Left: hamburger + logo + title */}
            <div className="flex items-center gap-2.5">
              <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors">
                <Icon name="Menu" size={20} />
              </button>
              <img
                src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
                alt="Бранч Ли"
                className="h-9 w-9 object-contain flex-shrink-0"
              />
              <div className="leading-tight">
                <div className="font-oswald font-bold text-sm tracking-widest text-gray-900 uppercase">Бранч Ли</div>
                <div className="font-oswald text-[10px] tracking-wider" style={{ color: "hsl(0,72%,40%)" }}>Журнал тренера</div>
              </div>
            </div>

            {/* Right: notification + logout */}
            <div className="flex items-center gap-2">
              <NotificationBell user={user} date={new Date().toISOString().slice(0, 10)} />
              <button
                onClick={() => setLogoutConfirm(true)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 bg-gray-50 hover:bg-gray-100">
                <Icon name="LogOut" size={16} />
              </button>
            </div>
          </div>

          {/* Profile strip — red gradient */}
          <div className="flex items-center gap-3 px-4 py-2.5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(0,72%,30%) 0%, hsl(0,72%,42%) 60%, hsl(0,60%,38%) 100%)" }}>
            {/* decorative brush strokes */}
            <svg className="absolute right-0 top-0 h-full opacity-20" viewBox="0 0 120 48" fill="none" style={{ width: 120 }}>
              <path d="M80,2 Q100,0 118,8 L120,40 Q100,48 78,44 Q60,40 65,24 Q68,10 80,2Z" fill="white" />
              <path d="M30,5 Q50,0 70,10 L68,38 Q48,46 28,42 Q10,38 12,22 Q14,8 30,5Z" fill="white" />
            </svg>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={18} className="text-white" />
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{user.full_name}</div>
            </div>

            {/* Role badge */}
            <span className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
              {user.role === "admin" ? "Админ" : "Тренер"}
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
