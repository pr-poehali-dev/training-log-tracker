import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import type { Store } from "@/store/useStore";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props { store: Store }

export default function PaymentsSection({ store }: Props) {
  const { students, halls, groups, currentMon, isPaid, togglePayment } = store;
  const [hall, setHall] = useState("all");
  const [grp, setGrp] = useState("all");
  const [month, setMonth] = useState(currentMon);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);

  const filtered = students.filter(s =>
    (hall === "all" || s.hall === hall) &&
    (grp === "all" || s.grp === grp)
  );

  const paidCount = filtered.filter(s => isPaid(s.id, month)).length;
  const totalRevenue = filtered.filter(s => isPaid(s.id, month)).reduce((sum, s) => sum + s.fee, 0);
  const unpaidCount = filtered.length - paidCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Оплаты</h1>
        <Button size="sm" onClick={() => setConfirm({ title: "Отметить всех", message: `Оплата для ${filtered.length} учеников?`, action: () => filtered.forEach(s => togglePayment(s.id, month, true)) })}
          style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
          💰 Все
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="text-2xl font-oswald font-bold neon-text-green">{paidCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Оплатили</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,65%)" }}>{unpaidCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Не оплатили</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl font-oswald font-bold neon-text-orange">{(totalRevenue / 1000).toFixed(1)}к</div>
          <div className="text-xs text-muted-foreground mt-1">Выручка ₽</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-glass rounded-2xl p-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <select value={hall} onChange={e => setHall(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="all">Все залы</option>
            {halls.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <select value={grp} onChange={e => setGrp(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="all">Все группы</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Unpaid first */}
      <div className="flex flex-col gap-2">
        {[...filtered].sort((a, b) => {
          const ap = isPaid(a.id, month); const bp = isPaid(b.id, month);
          if (ap === bp) return 0; return ap ? 1 : -1;
        }).map(s => {
          const paid = isPaid(s.id, month);
          return (
            <div key={s.id} className={`card-glass rounded-xl p-3 flex items-center gap-3 border-l-2 ${paid ? "border-l-[hsl(142,71%,45%)]" : "border-l-[hsl(0,72%,58%)]"}`}>
              <div className="flex-1">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.hall} · {s.fee} ₽</div>
              </div>
              <span className={paid ? "badge-paid" : "badge-overdue"}>{paid ? "✓ Оплачен" : "✗ Нет"}</span>
              <Button size="sm" variant="ghost"
                style={paid ? { color: "hsl(215,20%,55%)", fontSize: 12 } : { color: "hsl(0,72%,40%)", fontSize: 12, fontWeight: 700 }}
                onClick={() => paid
                  ? setConfirm({ title: "Снять оплату", message: s.name, action: () => togglePayment(s.id, month, false) })
                  : setConfirm({ title: "Отметить оплату", message: `${s.name} — ${s.fee} ₽?`, action: () => togglePayment(s.id, month, true) })}>
                {paid ? "Снять" : "Оплатить"}
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="CreditCard" size={40} className="mx-auto mb-3 opacity-30" />
            <p>Нет учеников</p>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} message={confirm?.message || ""}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}