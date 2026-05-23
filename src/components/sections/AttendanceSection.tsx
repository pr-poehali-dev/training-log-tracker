import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import type { Store } from "@/store/useStore";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props { store: Store }

export default function AttendanceSection({ store }: Props) {
  const { students, halls, groups, today, isPresent, toggleAttendance } = store;
  const [hall, setHall] = useState("all");
  const [grp, setGrp] = useState("all");
  const [date, setDate] = useState(today);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);

  const filtered = students.filter(s =>
    (hall === "all" || s.hall === hall) &&
    (grp === "all" || s.grp === grp)
  );

  const presentCount = filtered.filter(s => isPresent(s.id, date)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Посещения</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setConfirm({ title: "Все присутствуют", message: `${filtered.length} учеников?`, action: () => filtered.forEach(s => toggleAttendance(s.id, date, true)) })}
            style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
            ✅
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm({ title: "Все отсутствуют", message: `${filtered.length} учеников?`, action: () => filtered.forEach(s => toggleAttendance(s.id, date, false)) })}>
            ❌
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="stat-card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Присутствуют</span>
          <span className="font-oswald text-lg neon-text-green">{presentCount} / {filtered.length}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${filtered.length ? (presentCount / filtered.length * 100) : 0}%`, background: "hsl(0,72%,40%)" }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {filtered.length ? Math.round(presentCount / filtered.length * 100) : 0}% посещаемость
        </div>
      </div>

      {/* Filters */}
      <div className="card-glass rounded-2xl p-4 flex flex-col gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full" />
        <div className="grid grid-cols-2 gap-2">
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

      {/* List */}
      <div className="card-glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Calendar" size={40} className="mx-auto mb-3 opacity-30" />
            <p>Нет учеников</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "hsl(0,0%,96%)" }}>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Ученик</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Группа</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const here = isPresent(s.id, date);
                return (
                  <tr key={s.id} className="border-t border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.grp}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${here ? "badge-present" : "badge-absent"}`}
                        style={{ minWidth: 80 }}
                        onClick={() => here
                          ? setConfirm({ title: "Снять посещение", message: s.name, action: () => toggleAttendance(s.id, date, false) })
                          : toggleAttendance(s.id, date, true)}>
                        {here ? "✓ Был" : "Отметить"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} message={confirm?.message || ""}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}