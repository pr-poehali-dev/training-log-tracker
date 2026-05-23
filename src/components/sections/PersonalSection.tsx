import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import type { Store } from "@/store/useStore";
import type { PersonalSession } from "@/types";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props { store: Store }

export default function PersonalSection({ store }: Props) {
  const { students, personal, halls, currentMon, addPersonal, updatePersonal, deletePersonal } = store;
  const [month, setMonth] = useState(currentMon);
  const [hall, setHall] = useState("all");
  const [sid, setSid] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<PersonalSession | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [form, setForm] = useState({ sid: "", date: store.today, dur: 60, cost: 1500, paid: true, note: "" });

  const hallStudents = hall === "all" ? students : students.filter(s => s.hall === hall);
  const list = personal
    .filter(p => p.date.startsWith(month) && (sid === "all" || p.sid === sid) && (hall === "all" || hallStudents.some(s => s.id === p.sid)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalRev = list.filter(p => p.paid).reduce((sum, p) => sum + p.cost, 0);

  const openModal = (p?: PersonalSession) => {
    setEditSession(p || null);
    setForm(p ? { sid: p.sid, date: p.date, dur: p.dur, cost: p.cost, paid: p.paid, note: p.note } : { sid: students[0]?.id || "", date: store.today, dur: 60, cost: 1500, paid: true, note: "" });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.sid) return;
    if (editSession) updatePersonal(editSession.id, form);
    else addPersonal(form);
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Персональные</h1>
        <Button onClick={() => openModal()} style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
          <Icon name="Plus" size={16} className="mr-1" /> Добавить
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card text-center">
          <div className="text-2xl font-oswald neon-text-green">{list.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Тренировок</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl font-oswald neon-text-orange">{totalRev.toLocaleString()} ₽</div>
          <div className="text-xs text-muted-foreground mt-1">Выручка</div>
        </div>
      </div>

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
        <select value={sid} onChange={e => setSid(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="all">Все ученики</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        {list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="User" size={40} className="mx-auto mb-3 opacity-30" />
            <p>Нет тренировок</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "hsl(0,0%,96%)" }}>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Дата</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Ученик</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Мин</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">₽</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider">Ст.</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const s = students.find(s => s.id === p.sid);
                return (
                  <tr key={p.id} className="border-t border-border/30 hover:bg-secondary/30">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.date}</td>
                    <td className="px-4 py-3 font-semibold">{s?.name || "—"}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.dur}</td>
                    <td className="px-4 py-3 text-center font-mono neon-text-green">{p.cost}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={p.paid ? "badge-paid" : "badge-overdue"}>{p.paid ? "✓" : "✗"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="text-muted-foreground hover:text-foreground transition-colors text-xs" onClick={() => openModal(p)}>✏️</button>
                        <button className="text-muted-foreground hover:text-red-400 transition-colors text-xs ml-1" onClick={() => setConfirm({ title: "Удалить", message: "Удалить тренировку?", action: () => deletePersonal(p.id) })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm" style={{ background: "#fff", border: "1px solid hsl(0,0%,88%)" }}>
          <DialogHeader>
            <DialogTitle className="font-oswald text-xl tracking-wide neon-text-green">
              {editSession ? "Редактировать" : "Новая тренировка"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Ученик</Label>
              <select value={form.sid} onChange={e => setForm(p => ({ ...p, sid: e.target.value }))}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full">
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase mb-1 block">Дата</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase mb-1 block">Минут</Label>
                <Input type="number" value={form.dur} onChange={e => setForm(p => ({ ...p, dur: +e.target.value }))} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase mb-1 block">Стоимость ₽</Label>
                <Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: +e.target.value }))} className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase mb-1 block">Оплата</Label>
                <select value={form.paid ? "1" : "0"} onChange={e => setForm(p => ({ ...p, paid: e.target.value === "1" }))}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full">
                  <option value="1">Оплачено</option>
                  <option value="0">Не оплачено</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase mb-1 block">Заметка</Label>
              <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2}
                placeholder="Что отрабатывали..."
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Отмена</Button>
              <Button onClick={save} className="flex-1" style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>Сохранить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} message={confirm?.message || ""}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}