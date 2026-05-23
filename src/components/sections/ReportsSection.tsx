import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import type { Store } from "@/store/useStore";

interface Props { store: Store }

interface TooltipPayload { dataKey: string; color: string; value: number; }
interface TooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-glass rounded-xl p-3 border border-border/60 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>{p.value}</p>
      ))}
    </div>
  );
};

export default function ReportsSection({ store }: Props) {
  const { students, attendance, payments, personal, halls, groups, currentMon, isPaid, isCertValid } = store;
  const [hall, setHall] = useState("all");
  const [grp, setGrp] = useState("all");
  const [month, setMonth] = useState(currentMon);

  const filtered = students.filter(s =>
    (hall === "all" || s.hall === hall) &&
    (grp === "all" || s.grp === grp)
  );

  let subsRev = 0, persRev = 0, persCount = 0;
  const uniqueDays = new Set<string>();

  filtered.forEach(s => {
    if (isPaid(s.id, month)) subsRev += s.fee;
    attendance.filter(a => a.sid === s.id && a.date.startsWith(month)).forEach(a => uniqueDays.add(a.date));
    personal.filter(p => p.sid === s.id && p.date.startsWith(month) && p.paid).forEach(p => { persRev += p.cost; persCount++; });
  });

  const totalRev = subsRev + persRev;

  // Chart data: last 6 months
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const m = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("ru-RU", { month: "short" });
    const visits = attendance.filter(a => a.date.startsWith(m) && a.present).length;
    const income = students.reduce((sum, s) => {
      const sp = payments.find(p => p.sid === s.id && p.mon === m && p.paid);
      return sum + (sp ? s.fee : 0);
    }, 0) + personal.filter(p => p.date.startsWith(m) && p.paid).reduce((sum, p) => sum + p.cost, 0);
    return { month: label, visits, income: Math.round(income / 1000 * 10) / 10 };
  });

  const exportCSV = () => {
    const headers = ["Имя", "Зал", "Группа", "IKO", "Телефон", "Уровень", "Справка", "До", "Тренировок", "Был", "Перс.", "%", "Оплата", "₽"];
    const rows = filtered.map(s => {
      const a = attendance.filter(a => a.sid === s.id && a.date.startsWith(month));
      const pres = a.filter(a => a.present).length;
      const pt = personal.filter(p => p.sid === s.id && p.date.startsWith(month)).length;
      const paid = isPaid(s.id, month);
      return [s.name, s.hall, s.grp, s.iko, s.phone, s.lvl, s.cert ? (isCertValid(s) ? "Действительна" : "Просрочена") : "Нет", s.ce, a.length, pres, pt, a.length ? Math.round(pres / a.length * 100) : 0, paid ? "Оплачен" : "Не оплачен", s.fee];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `журнал_${month}.csv`; a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Отчёты</h1>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1">
          <Icon name="Download" size={14} /> CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Абонементы</div>
          <div className="text-xl font-oswald neon-text-green">{subsRev.toLocaleString()} ₽</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Персональные</div>
          <div className="text-xl font-oswald neon-text-purple">{persRev.toLocaleString()} ₽</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Итого</div>
          <div className="text-xl font-oswald neon-text-orange">{totalRev.toLocaleString()} ₽</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Занятий / Перс.</div>
          <div className="text-xl font-oswald text-foreground">{uniqueDays.size} / {persCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-glass rounded-2xl p-4 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <select value={hall} onChange={e => setHall(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="all">Все залы</option>
            {halls.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={grp} onChange={e => setGrp(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="all">Все группы</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Chart: visits */}
      <div className="card-glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Посещения (6 мес.)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(220,15%,25%,0.5)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="visits" fill="hsl(168,85%,50%)" radius={[4, 4, 0, 0]} name="Посещений" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart: income */}
      <div className="card-glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Доход (тыс. ₽, 6 мес.)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(220,15%,25%,0.5)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="income" stroke="hsl(28,95%,58%)" strokeWidth={2.5} dot={{ fill: "hsl(28,95%,58%)", r: 4 }} name="Доход (к₽)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "hsl(220,15%,12%)" }}>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Ученик</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Был/Всего</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Перс.</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">%</th>
              <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Оплата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const a = attendance.filter(a => a.sid === s.id && a.date.startsWith(month));
              const pres = a.filter(a => a.present).length;
              const pt = personal.filter(p => p.sid === s.id && p.date.startsWith(month)).length;
              const paid = isPaid(s.id, month);
              const pct = a.length ? Math.round(pres / a.length * 100) : 0;
              return (
                <tr key={s.id} className="border-t border-border/30 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{pres}/{a.length}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{pt}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono font-bold ${pct >= 75 ? "neon-text-green" : pct >= 50 ? "neon-text-orange" : "text-red-400"}`}>{pct}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={paid ? "badge-paid" : "badge-overdue"}>{paid ? "✓" : "✗"}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Нет данных</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}