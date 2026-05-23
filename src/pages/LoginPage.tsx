import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await authApi.login({ username, password });
      localStorage.setItem("iko_user", JSON.stringify(user));
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-golos px-4"
      style={{ background: "hsl(0,0%,96%)" }}>

      {/* Logo block */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <img
          src="https://cdn.poehali.dev/files/1fec5d10-7a6f-474c-9ffc-803e6e256c69.png"
          alt="Эмблема"
          className="w-24 h-24 object-contain"
        />
        <img
          src="https://cdn.poehali.dev/files/933d3a2d-bfbc-4200-ba9a-8fb9c1df2b69.png"
          alt="Бранч Ли"
          className="h-10 object-contain"
        />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-oswald">Журнал тренера</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="font-oswald text-xl font-bold tracking-wide mb-5 text-center" style={{ color: "hsl(0,72%,40%)" }}>
          ВХОД В СИСТЕМУ
        </h1>
        <form onSubmit={login} className="flex flex-col gap-4">
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Логин</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              className="bg-gray-50 border-gray-200"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Пароль</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              className="bg-gray-50 border-gray-200"
              required
            />
          </div>
          {error && (
            <div className="text-sm text-center px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full font-bold tracking-wide mt-1"
            style={{ background: "hsl(0,72%,40%)", color: "#fff" }}
          >
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          Нет аккаунта? Обратитесь к администратору.
        </p>
      </div>

      {/* Strip */}
      <div className="mt-6 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-oswald"
        style={{ background: "hsl(0,72%,37%)", color: "rgba(255,255,255,0.8)" }}>
        Ростовская обл. · Кюокушинкай карате-до
      </div>
    </div>
  );
}
