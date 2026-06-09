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
    <div className="min-h-screen flex flex-col items-center justify-end font-golos px-5 pb-16 relative overflow-hidden">

      {/* Фон */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/2d0633d8-2e91-461f-8a1b-9550dbab06af.jpg"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>

      {/* Форма входа */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 relative z-10">
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
            <span className="relative z-10">{loading ? "Вход..." : "ВОЙТИ"}</span>
          </button>
        </form>

        <div className="flex items-center gap-2 mt-5 text-gray-400">
          <Icon name="HelpCircle" size={14} />
          <p className="text-xs">Нет аккаунта? Обратитесь к администратору.</p>
        </div>
      </div>


    </div>
  );
}