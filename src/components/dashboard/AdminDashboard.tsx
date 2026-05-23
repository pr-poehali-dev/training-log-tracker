import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, studentsApi, attendanceApi, paymentsApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monStr = () => new Date().toISOString().slice(0, 7);
const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";

function PrimaryBtn({ children, onClick, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50" style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>{children}</button>;
}
function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">{children}</button>;
}
function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

// ─── ТРЕНЕРЫ ──────────────────────────────────────────────────────────────────
function TrainersTab({ user }: { user: AppUser }) {
  const qc = useQueryClient();
  const { data: trainers = [], isLoading } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", hall: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState<Set<number>>(new Set());

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      await authApi.register(form);
      qc.invalidateQueries({ queryKey: ["trainers"] });
      setShowForm(false);
      setForm({ username: "", password: "", full_name: "", hall: "" });
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const del = async (id: number, name: string) => {
    if (!window.confirm(`Удалить тренера "${name}"? Все его ученики и данные будут удалены.`)) return;
    setDeleting(prev => new Set([...prev, id]));
    try { await authApi.deleteTrainer(id); qc.invalidateQueries({ queryKey: ["trainers"] }); }
    finally { setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Тренеры</h1>
        <PrimaryBtn onClick={() => setShowForm(!showForm)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>
      <div className="stat-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(0,72%,97%)" }}><Icon name="Users" size={20} style={{ color: "hsl(0,72%,40%)" }} /></div>
        <div><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(trainers as []).length}</div><div className="text-xs text-gray-400">Тренеров зарегистрировано</div></div>
      </div>

      {showForm && (
        <div className="card-glass rounded-2xl p-4">
          <h2 className="font-oswald text-base font-bold mb-3" style={{ color: "hsl(0,72%,40%)" }}>Новый тренер</h2>
          <form onSubmit={save} className="flex flex-col gap-3">
            <input className={inputCls} placeholder="ФИО *" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Логин *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
              <input className={inputCls} type="password" placeholder="Пароль *" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <input className={inputCls} placeholder="Зал (необязательно)" value={form.hall} onChange={e => setForm(p => ({ ...p, hall: e.target.value }))} />
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="flex gap-2"><OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : "Создать тренера"}</PrimaryBtn></div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(trainers as Record<string, unknown>[]).map(t => (
          <div key={t.id as number} className="card-glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-oswald font-bold text-gray-500">{ini(t.full_name as string)}</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t.full_name as string}</div>
              <div className="text-xs text-gray-400">@{t.username as string}{t.hall ? ` · ${t.hall}` : ""}</div>
              <div className="text-[10px] text-gray-300 mt-0.5">с {(t.created_at as string)?.slice(0, 10)}</div>
            </div>
            <button onClick={() => del(t.id as number, t.full_name as string)} disabled={deleting.has(t.id as number)}
              className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40">
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        ))}
        {(trainers as []).length === 0 && <div className="text-center py-10 text-gray-400"><Icon name="Users" size={40} className="mx-auto mb-2 opacity-20" /><p>Нет тренеров</p></div>}
      </div>
    </div>
  );
}

// ─── ДАННЫЕ ───────────────────────────────────────────────────────────────────
function DataTab() {
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());
  const qc = useQueryClient();

  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const enabled = selectedTrainer !== null;
  const { data: students = [], isLoading: sLoad } = useQuery({ queryKey: ["students-admin", selectedTrainer], queryFn: () => studentsApi.list(selectedTrainer!), enabled });
  const { data: attData = [] } = useQuery({ queryKey: ["att-admin", date, selectedTrainer], queryFn: () => attendanceApi.byDate(date, selectedTrainer!), enabled });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-admin", month, selectedTrainer], queryFn: () => paymentsApi.byMonth(month, selectedTrainer!), enabled });

  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const isPresent = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present);
  const isPaid = (sid: number) => (payData as Record<string, unknown>[]).some(p => p.student_id === sid && p.paid);

  const toggleAtt = async (sid: number, current: boolean) => {
    const k = `a${sid}`;
    setToggling(prev => new Set([...prev, k]));
    try { await attendanceApi.mark({ student_id: sid, date, present: !current }); qc.invalidateQueries({ queryKey: ["att-admin"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(k); return n; }); }
  };
  const togglePay = async (sid: number, current: boolean) => {
    const k = `p${sid}`;
    setToggling(prev => new Set([...prev, k]));
    try { await paymentsApi.mark({ student_id: sid, month, paid: !current }); qc.invalidateQueries({ queryKey: ["pay-admin"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(k); return n; }); }
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <h1 className="section-title">Данные</h1>
      <div className="card-glass rounded-2xl p-3 flex flex-col gap-2">
        <select className={inputCls} value={selectedTrainer ?? ""} onChange={e => setSelectedTrainer(e.target.value ? +e.target.value : null)}>
          <option value="">Выберите тренера...</option>
          {(trainers as Record<string, unknown>[]).map(t => <option key={t.id as number} value={t.id as number}>{t.full_name as string}{t.hall ? ` · ${t.hall}` : ""}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
          <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      {!enabled && <div className="text-center py-10 text-gray-400"><Icon name="Database" size={40} className="mx-auto mb-2 opacity-20" /><p>Выберите тренера</p></div>}
      {enabled && sLoad && <Loading />}
      {enabled && !sLoad && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{(students as []).length}</div><div className="text-xs text-gray-400">Учеников</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{(students as Record<string, unknown>[]).filter(s => isPresent(s.id as number)).length}</div><div className="text-xs text-gray-400">Сегодня</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(students as Record<string, unknown>[]).filter(s => isPaid(s.id as number)).length}</div><div className="text-xs text-gray-400">Оплатили</div></div>
          </div>
          <div className="flex flex-col gap-2">
            {(students as Record<string, unknown>[]).map(s => {
              const sid = s.id as number;
              const here = isPresent(sid);
              const paid = isPaid(sid);
              return (
                <div key={sid} className={`card-glass rounded-xl p-3 border-l-2 ${paid ? "border-l-green-500" : "border-l-red-400"}`}>
                  <div className="font-semibold text-sm mb-1">{s.name as string}</div>
                  <div className="text-xs text-gray-400 mb-2">{s.hall as string} · {s.grp as string}</div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAtt(sid, here)} disabled={toggling.has(`a${sid}`)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${here ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:border-red-300"}`}>
                      {here ? "✓ Был (снять)" : "Отметить"}
                    </button>
                    <button onClick={() => togglePay(sid, paid)} disabled={toggling.has(`p${sid}`)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${paid ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:border-red-300"}`}>
                      {paid ? "✓ Оплачен (снять)" : "Оплатить"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ОТЧЁТЫ (ADMIN — ВИДИТ ВСЁ) ───────────────────────────────────────────────
interface TipP { active?: boolean; payload?: {color:string;value:number;dataKey:string}[]; label?: string }
const ChartTip = ({ active, payload, label }: TipP) => {
  if (!active || !payload?.length) return null;
  return <div className="card-glass rounded-xl p-2 border border-gray-200 shadow text-xs"><p className="text-gray-400 mb-1">{label}</p>{payload.map(p => <p key={p.dataKey} style={{ color: p.color }} className="font-bold">{p.value}</p>)}</div>;
};

function ReportsTab() {
  const [month, setMonth] = useState(monStr());
  const [trainerId, setTrainerId] = useState<number | null>(null);
  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const { data, isLoading } = useQuery({ queryKey: ["reports-admin", month, trainerId], queryFn: () => reportsApi.get(month, trainerId ?? undefined) });

  const summary = data?.summary || {};
  const students: Record<string, unknown>[] = data?.students || [];
  const trainerRows: Record<string, unknown>[] = data?.trainers || [];

  const chartData = trainerId
    ? students.map(s => ({ name: ini(s.name as string), pct: s.attendance_rate as number }))
    : trainerRows.map(t => ({ name: ini(t.full_name as string), abs: t.subs_rev as number, pers: t.pers_rev as number }));

  const exportCsv = () => {
    const headers = trainerId
      ? ["Ученик", "Зал", "Группа", "Был/Всего", "Перс.", "%", "Оплата", "Абонемент ₽"]
      : ["Тренер", "Зал", "Учеников", "Абонементы ₽", "Персональные ₽", "Итого ₽"];
    const rows = trainerId
      ? students.map(s => [s.name, s.hall, s.grp, `${s.present_count}/${s.total_days}`, s.personal_count, s.attendance_rate + "%", s.paid ? "Оплачен" : "Не оплачен", s.paid ? s.fee : 0])
      : trainerRows.map(t => [t.full_name, t.hall, t.student_count, t.subs_rev, t.pers_rev, t.total_rev]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = `отчёт_${month}.csv`; a.click();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between"><h1 className="section-title">Отчёты</h1><OutlineBtn onClick={exportCsv}>⬇ CSV</OutlineBtn></div>
      <div className="card-glass rounded-2xl p-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
          <select className={inputCls} value={trainerId ?? ""} onChange={e => setTrainerId(e.target.value ? +e.target.value : null)}>
            <option value="">Все тренеры</option>
            {(trainers as Record<string, unknown>[]).map(t => <option key={t.id as number} value={t.id as number}>{t.full_name as string}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <Loading />}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{summary.total_students || 0}</div><div className="text-xs text-gray-400">Учеников</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{(summary.paid_count || 0)}</div><div className="text-xs text-gray-400">Оплатили</div></div>
            {summary.total_revenue !== undefined && <>
              <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(summary.subs_revenue || 0).toLocaleString()} ₽</div><div className="text-xs text-gray-400">Абонементы</div></div>
              <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-purple-600">{(summary.pers_revenue || 0).toLocaleString()} ₽</div><div className="text-xs text-gray-400">Персональные</div></div>
            </>}
          </div>

          {summary.total_revenue !== undefined && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(0,72%,40%)" }}>
              <div className="text-2xl font-oswald font-bold text-white">{(summary.total_revenue || 0).toLocaleString()} ₽</div>
              <div className="text-xs text-red-200 mt-1">Итого выручка за месяц</div>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="card-glass rounded-2xl p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{trainerId ? "Посещаемость %" : "Выручка по тренерам (₽)"}</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  {trainerId
                    ? <Bar dataKey="pct" fill="hsl(0,72%,40%)" radius={[4, 4, 0, 0]} name="%" />
                    : <><Bar dataKey="abs" fill="hsl(0,72%,40%)" radius={[4, 4, 0, 0]} name="Абон." /><Bar dataKey="pers" fill="hsl(265,60%,55%)" radius={[4, 4, 0, 0]} name="Перс." /></>}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!trainerId && trainerRows.length > 0 && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-xs text-gray-400 uppercase">Тренер</th><th className="text-right px-3 py-2.5 text-xs text-gray-400 uppercase">Абон.</th><th className="text-right px-3 py-2.5 text-xs text-gray-400 uppercase">Перс.</th><th className="text-right px-3 py-2.5 text-xs text-gray-400 uppercase">Итого</th></tr></thead>
                <tbody>
                  {trainerRows.map(t => (
                    <tr key={t.id as number} className="border-t border-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-xs">{t.full_name as string}<div className="text-[10px] text-gray-400">{t.student_count as number} уч.</div></td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600">{(t.subs_rev as number).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-purple-600">{(t.pers_rev as number).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(t.total_rev as number).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {trainerId && students.length > 0 && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-xs text-gray-400 uppercase">Ученик</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Посещ.</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Перс.</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">%</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Опл.</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id as number} className="border-t border-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-xs">{s.name as string}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{s.present_count as number}/{s.total_days as number}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{s.personal_count as number}</td>
                      <td className="px-3 py-2.5 text-center text-xs"><span className={`font-bold ${(s.attendance_rate as number) >= 75 ? "text-green-600" : (s.attendance_rate as number) >= 50 ? "text-amber-500" : "text-red-500"}`}>{s.attendance_rate as number}%</span></td>
                      <td className="px-3 py-2.5 text-center">{s.paid ? <span className="badge-paid">✓</span> : <span className="badge-overdue">✗</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
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
      {tab === "trainers" && <TrainersTab user={user} />}
      {tab === "data"     && <DataTab />}
      {tab === "reports"  && <ReportsTab />}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around max-w-2xl mx-auto left-0 right-0"
        style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.07)", paddingBottom: "env(safe-area-inset-bottom,0px)", minHeight: 60 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg transition-all" style={{ background: active ? "hsl(0,72%,96%)" : "transparent", color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)", transform: active ? "scale(1.1)" : "scale(1)" }}>
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
              </div>
              <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)" }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
