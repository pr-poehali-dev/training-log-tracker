import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { personalApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { PrimaryBtn, OutlineBtn, BottomSheet, inputCls } from "@/components/dashboard/trainer-ui";

const SESSION_TYPES = [
  { value: "kata",     label: "Ката класс" },
  { value: "group",    label: "Групповая тренировка" },
  { value: "strength", label: "Силовая тренировка" },
  { value: "personal", label: "Персональная тренировка" },
];
const typeLabel = (v: string) => SESSION_TYPES.find(t => t.value === v)?.label || "Персональная тренировка";

type Form = { date: string; duration: number; cost: number; paid: boolean; note: string; session_type: string };

export default function AdminPersonalList({ trainerId, month }: { trainerId: number; month: string }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["personal-admin", month, trainerId],
    queryFn: () => personalApi.byMonth(month, trainerId),
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>({ date: "", duration: 60, cost: 1500, paid: false, note: "", session_type: "personal" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const list = data as Record<string, unknown>[];
  const total = list.filter(p => p.paid).reduce((s, p) => s + (p.cost as number), 0);

  const openEdit = (p: Record<string, unknown>) => {
    setEditId(p.id as number);
    setForm({
      date: (p.date as string).slice(0, 10),
      duration: p.duration as number,
      cost: p.cost as number,
      paid: Boolean(p.paid),
      note: (p.note as string) || "",
      session_type: (p.session_type as string) || "personal",
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await personalApi.update(editId!, form);
      qc.invalidateQueries({ queryKey: ["personal-admin"] });
      qc.invalidateQueries({ queryKey: ["personal"] });
      setEditId(null);
    } finally { setSaving(false); }
  };

  const del = async (p: Record<string, unknown>) => {
    if (!window.confirm(`Удалить тренировку «${p.name as string}»?`)) return;
    setDeleting(p.id as number);
    try {
      await personalApi.remove(p.id as number);
      qc.invalidateQueries({ queryKey: ["personal-admin"] });
      qc.invalidateQueries({ queryKey: ["personal"] });
    } finally { setDeleting(null); }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "hsl(262,52%,96%)" }}>
        <div className="flex items-center gap-1.5">
          <Icon name="Dumbbell" size={13} style={{ color: "hsl(262,52%,42%)" }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "hsl(262,52%,42%)" }}>
            Доп. тренировки ({list.length})
          </span>
        </div>
        <span className="text-xs font-bold text-gray-600">{total.toLocaleString()} ₽</span>
      </div>

      {isLoading && <div className="text-center py-5 text-gray-400 text-xs">Загрузка...</div>}
      {!isLoading && list.length === 0 && <div className="text-center py-5 text-gray-400 text-xs">Нет тренировок за этот месяц</div>}

      {list.map(p => (
        <div key={p.id as number} className="px-3 py-2.5 border-t border-gray-50 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-gray-800 truncate">{p.name as string}</div>
            <div className="text-[11px] text-gray-400">
              {(p.date as string).slice(8, 10)}.{(p.date as string).slice(5, 7)} · {p.duration as number} мин · {typeLabel((p.session_type as string) || "personal")}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{(p.cost as number).toLocaleString()} ₽</div>
            <div className="text-[10px] font-bold" style={{ color: p.paid ? "hsl(142,55%,30%)" : "hsl(0,72%,50%)" }}>
              {p.paid ? "Оплачено" : "Не оплачено"}
            </div>
          </div>
          <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-blue-500 p-1" title="Изменить">
            <Icon name="Pencil" size={15} />
          </button>
          <button onClick={() => del(p)} disabled={deleting === p.id} className="text-gray-300 hover:text-red-500 p-1 disabled:opacity-40" title="Удалить">
            <Icon name="Trash2" size={15} />
          </button>
        </div>
      ))}

      <BottomSheet open={editId !== null} onClose={() => setEditId(null)} title="Изменить тренировку">
        <form onSubmit={save} className="flex flex-col gap-3">
          <div>
            <div className="text-[11px] text-gray-400 font-semibold mb-1">Тип тренировки</div>
            <select className={inputCls} value={form.session_type} onChange={e => setForm(p => ({ ...p, session_type: e.target.value }))}>
              {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <input className={inputCls} type="number" placeholder="Минут" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))} />
            <input className={inputCls} type="number" placeholder="Стоимость ₽" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: +e.target.value }))} />
            <select className={inputCls} value={form.paid ? "1" : "0"} onChange={e => setForm(p => ({ ...p, paid: e.target.value === "1" }))}>
              <option value="1">Оплачено</option><option value="0">Не оплачено</option>
            </select>
          </div>
          <textarea className={inputCls} rows={2} placeholder="Заметка..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          <div className="flex gap-2 pt-1">
            <OutlineBtn onClick={() => setEditId(null)}>Отмена</OutlineBtn>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? "..." : "Сохранить"}</PrimaryBtn>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
