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
      style={{ background: "#f5f5f5" }}>

      {/* Background karate silhouette */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute right-[-60px] top-[15%] opacity-[0.07]"
          style={{ fontSize: 320, lineHeight: 1, fontFamily: "serif", color: "#000", transform: "scaleX(-1)" }}>
          🥋
        </div>
        <div className="absolute left-[-40px] bottom-[20%] opacity-[0.05]"
          style={{ fontSize: 220, lineHeight: 1, fontFamily: "serif", color: "#000" }}>
          🥋
        </div>
        {/* ink splatter top */}
        <svg className="absolute top-0 left-0 right-0 w-full opacity-[0.04]" viewBox="0 0 400 120" fill="none">
          <ellipse cx="200" cy="-20" rx="260" ry="100" fill="#000" />
        </svg>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8 relative z-10">
        <img
          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
          alt="Эмблема"
          className="w-28 h-28 object-contain drop-shadow-md"
        />

        {/* BRANCH LEE brush title */}
        <div className="relative flex items-center justify-center">
          {/* red brush stroke behind text */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 56" preserveAspectRatio="none">
            <path d="M4,10 Q8,4 20,6 L265,3 Q278,4 276,18 L272,46 Q270,54 255,52 L18,54 Q5,53 4,44 Z"
              fill="#c41a1a" />
          </svg>
          <span className="relative z-10 font-oswald font-bold text-white tracking-widest px-8 py-2"
            style={{ fontSize: 28, letterSpacing: "0.12em", textShadow: "1px 1px 4px rgba(0,0,0,0.4)" }}>
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

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6 relative z-10">
        <h1 className="font-oswald text-xl font-bold tracking-widest mb-1 text-center"
          style={{ color: "hsl(0,72%,40%)" }}>
          ВХОД В СИСТЕМУ
        </h1>
        {/* decorative line + icon */}
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

          {/* brush-stroke button */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full py-3 font-oswald font-bold tracking-widest text-white text-base uppercase overflow-hidden rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: "hsl(0,72%,38%)" }}>
            {/* brush texture overlay */}
            <span className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='50'%3E%3Cpath d='M0,10 Q50,5 100,12 Q150,18 200,8 L200,42 Q150,48 100,40 Q50,33 0,44Z' fill='%23fff' opacity='0.3'/%3E%3C/svg%3E\") center/cover no-repeat"
              }} />
            <span className="relative z-10">{loading ? "Вход..." : "ВОЙТИ"}</span>
          </button>
        </form>

        <div className="flex items-center gap-2 mt-5 text-gray-400">
          <Icon name="HelpCircle" size={14} />
          <p className="text-xs">Нет аккаунта? Обратитесь к администратору.</p>
        </div>
      </div>

      {/* Bottom pill */}
      <div className="mt-6 relative z-10 flex items-center gap-1.5 px-5 py-2 rounded-full font-oswald text-[10px] uppercase tracking-widest text-white"
        style={{ background: "#111" }}>
        <Icon name="MapPin" size={11} />
        Ростовская обл. • Киокушинкай карате-до
      </div>
    </div>
  );
}
