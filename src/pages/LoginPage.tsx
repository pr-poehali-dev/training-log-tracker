import { useState } from "react";
import { authApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await authApi.login({ username, password });
      localStorage.setItem("iko_user", JSON.stringify(user));
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-golos px-5 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #e8e8e8 0%, #f2f2f2 40%, #ebebeb 100%)" }}>

      {/* ── Декоративный фон: горы, брызги туши ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* туманные горы вдали */}
        <path d="M0,520 Q60,420 130,460 Q180,490 220,440 Q270,390 310,430 Q350,460 390,410 L390,844 L0,844Z" fill="#d0d0d0" opacity="0.35"/>
        <path d="M0,560 Q80,490 160,530 Q220,560 260,510 Q300,470 340,510 Q365,530 390,500 L390,844 L0,844Z" fill="#c8c8c8" opacity="0.25"/>
        {/* пагода слева вдали */}
        <g opacity="0.08" transform="translate(18,320)">
          <rect x="28" y="80" width="4" height="60" fill="#222"/>
          <polygon points="18,80 42,80 30,62" fill="#222"/>
          <polygon points="14,90 46,90 30,72" fill="#222"/>
          <polygon points="10,100 50,100 30,82" fill="#222"/>
          <rect x="22" y="100" width="16" height="40" fill="#222"/>
        </g>
        {/* тушь-пятна сверху */}
        <ellipse cx="195" cy="-18" rx="280" ry="60" fill="#aaa" opacity="0.07"/>
        <ellipse cx="60" cy="30" rx="80" ry="22" fill="#999" opacity="0.05"/>
        <ellipse cx="330" cy="20" rx="70" ry="18" fill="#999" opacity="0.05"/>
        {/* брызги туши снизу */}
        <ellipse cx="195" cy="870" rx="260" ry="55" fill="#aaa" opacity="0.1"/>
        <ellipse cx="80" cy="820" rx="60" ry="16" fill="#999" opacity="0.06"/>
        <ellipse cx="310" cy="830" rx="55" ry="14" fill="#999" opacity="0.06"/>
      </svg>

      {/* ── Силуэт каратиста справа ── */}
      <svg className="absolute pointer-events-none select-none" style={{ right: -10, top: "10%", opacity: 0.09, width: 130, height: 280 }}
        viewBox="0 0 130 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* голова */}
        <circle cx="72" cy="22" r="13" fill="#111"/>
        {/* тело */}
        <path d="M72,35 L68,95 L58,145 L68,145 L72,110 L76,145 L86,145 L78,95 L72,35Z" fill="#111"/>
        {/* левая рука — вытянута вперёд (маэ-гери поза) */}
        <path d="M68,50 Q40,55 18,48 Q12,46 14,42 Q16,38 22,40 Q44,46 65,45Z" fill="#111"/>
        {/* правая рука — назад */}
        <path d="M76,52 Q98,60 112,72 Q116,76 113,79 Q110,82 107,78 Q94,66 74,58Z" fill="#111"/>
        {/* левая нога */}
        <path d="M68,145 L62,200 L58,240 L66,240 L70,205 L74,200 L72,145Z" fill="#111"/>
        {/* правая нога — поднята (высокий удар ногой) */}
        <path d="M76,145 Q90,130 108,118 Q114,114 116,118 Q118,122 113,126 Q96,136 80,148Z" fill="#111"/>
        {/* ступня правой */}
        <path d="M108,118 Q118,112 122,116 Q126,120 116,126Z" fill="#111"/>
        {/* пояс */}
        <rect x="62" y="90" width="20" height="6" rx="2" fill="#111"/>
      </svg>

      {/* ── Силуэт каратиста слева ── */}
      <svg className="absolute pointer-events-none select-none" style={{ left: -8, bottom: "12%", opacity: 0.07, width: 110, height: 240, transform: "scaleX(-1)" }}
        viewBox="0 0 110 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* голова */}
        <circle cx="55" cy="20" r="12" fill="#111"/>
        {/* тело стойка */}
        <path d="M55,32 L50,85 L44,130 L54,130 L55,100 L56,130 L66,130 L60,85 L55,32Z" fill="#111"/>
        {/* руки — гардовая стойка */}
        <path d="M50,48 Q30,42 20,50 Q15,54 18,58 Q21,62 26,58 Q36,52 50,52Z" fill="#111"/>
        <path d="M60,50 Q80,44 92,36 Q97,32 95,28 Q93,24 88,27 Q76,34 58,46Z" fill="#111"/>
        {/* ноги */}
        <path d="M50,130 L44,180 L40,220 L50,220 L54,182 L58,180 L56,130Z" fill="#111"/>
        <path d="M60,130 L64,180 L68,220 L58,220 L54,182 L50,180 L56,130Z" fill="#111"/>
        {/* пояс */}
        <rect x="44" y="80" width="22" height="5" rx="2" fill="#111"/>
      </svg>

      {/* ── Логотип ── */}
      <div className="flex flex-col items-center gap-3 mb-8 relative z-10">
        <img
          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
          alt="Эмблема"
          className="w-28 h-28 object-contain drop-shadow-md"
        />

        {/* BRANCH LEE — мазок кисти */}
        <div className="relative flex items-center justify-center" style={{ minWidth: 260 }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 56" preserveAspectRatio="none">
            <path d="M2,12 Q6,2 22,5 L262,2 Q278,3 277,16 L274,44 Q272,54 256,53 L20,55 Q4,54 2,43 Z" fill="#c41a1a"/>
            {/* текстура кисти */}
            <path d="M2,12 Q40,8 80,14 Q140,20 200,10 L262,2 Q268,2 272,6 Q260,10 210,14 Q140,22 80,16 Q40,12 8,16 Z" fill="#a81010" opacity="0.4"/>
          </svg>
          <span className="relative z-10 font-oswald font-bold text-white px-8 py-2"
            style={{ fontSize: 30, letterSpacing: "0.14em", textShadow: "1px 2px 6px rgba(0,0,0,0.45)" }}>
            BRANCH LEE
          </span>
        </div>

        {/* subtitle */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-px bg-gray-400" />
          <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-oswald">Журнал тренера</span>
          <div className="w-8 h-px bg-gray-400" />
        </div>
      </div>

      {/* ── Форма входа ── */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6 relative z-10">
        <h1 className="font-oswald text-xl font-bold tracking-widest mb-1 text-center"
          style={{ color: "hsl(0,72%,40%)" }}>
          ВХОД В СИСТЕМУ
        </h1>
        <div className="flex items-center justify-center mb-5">
          <div className="w-8 h-px bg-gray-300" />
          <span className="mx-2 text-base" style={{ color: "hsl(0,72%,40%)" }}>✊</span>
          <div className="w-8 h-px bg-gray-300" />
        </div>

        <form onSubmit={login} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1.5 block">Логин</label>
            <div className="relative">
              <Icon name="User" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1.5 block">Пароль</label>
            <div className="relative">
              <Icon name="Lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-center px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3 font-oswald font-bold tracking-widest text-white text-base uppercase overflow-hidden rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: "hsl(0,72%,38%)" }}>
            <span className="absolute inset-0 pointer-events-none opacity-20"
              style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='50'%3E%3Cpath d='M0,10 Q50,5 100,12 Q150,18 200,8 L200,42 Q150,48 100,40 Q50,33 0,44Z' fill='%23fff' opacity='0.3'/%3E%3C/svg%3E\") center/cover no-repeat" }} />
            <span className="relative z-10">{loading ? "Вход..." : "ВОЙТИ"}</span>
          </button>
        </form>

        <div className="flex items-center gap-2 mt-5 text-gray-400">
          <Icon name="HelpCircle" size={14} />
          <p className="text-xs">Нет аккаунта? Обратитесь к администратору.</p>
        </div>
      </div>

      {/* ── Bottom pill ── */}
      <div className="mt-6 relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-full font-oswald text-[10px] uppercase tracking-widest text-white"
        style={{ background: "#111" }}>
        <Icon name="MapPin" size={11} />
        Ростовская обл. • Киокушинкай карате-до
      </div>
    </div>
  );
}
