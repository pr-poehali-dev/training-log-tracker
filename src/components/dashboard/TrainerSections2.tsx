import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, personalApi, notesApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";

// ─── PERSONAL ─────────────────────────────────────────────────────────────────
export function PersonalSection({ user, month }: { user: AppUser; month: string }) {
  const qc = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ["personal", month, user.id], queryFn: () => personalApi.byMonth(month) });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ student_id: "", date: todayStr(), duration: 60, cost: 1500, paid: false, note: "" });
  const [saving, setSaving] = useState(false);

  const totalRev = (sessions as Record<string, unknown>[]).filter(p => p.paid).reduce((s, p) => s + (p.cost as number), 0);

  const openAdd = () => { setEditId(null); setForm({ student_id: (students as Record<string, unknown>[])[0]?.id?.toString() || "", date: todayStr(), duration: 60, cost: 1500, paid: false, note: "" }); setShowForm(true); };
  const openEdit = (p: Record<string, unknown>) => { setEditId(p.id as number); setForm({ student_id: String(p.student_id), date: p.date as string, duration: p.duration as number, cost: p.cost as number, paid: p.paid as boolean, note: p.note as string || "" }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) { await personalApi.update(editId, { ...form, student_id: +form.student_id }); }
      else { await personalApi.create({ ...form, student_id: +form.student_id }); }
      qc.invalidateQueries({ queryKey: ["personal"] }); setShowForm(false);
    } finally { setSaving(false); }
  };
  const del = async (id: number) => {
    if (!window.confirm("Удалить тренировку?")) return;
    await personalApi.remove(id); qc.invalidateQueries({ queryKey: ["personal"] });
  };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><h1 className="section-title">Персональные</h1><PrimaryBtn onClick={openAdd}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(sessions as []).length}</div><div className="text-xs text-gray-400 mt-1">Тренировок</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{totalRev.toLocaleString()} ₽</div><div className="text-xs text-gray-400 mt-1">Выручка</div></div>
      </div>
      <div className="card-glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-xs text-gray-400 uppercase">Дата</th><th className="text-left px-3 py-2.5 text-xs text-gray-400 uppercase">Ученик</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Мин</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">₽</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Ст.</th><th /></tr></thead>
          <tbody>
            {(sessions as Record<string, unknown>[]).map(p => (
              <tr key={p.id as number} className="border-t border-gray-50">
                <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{(p.date as string).slice(5)}</td>
                <td className="px-3 py-2.5 font-semibold text-xs">{p.name as string}</td>
                <td className="px-3 py-2.5 text-center text-gray-500">{p.duration as number}</td>
                <td className="px-3 py-2.5 text-center font-mono text-green-700">{p.cost as number}</td>
                <td className="px-3 py-2.5 text-center">{p.paid ? <span className="badge-paid">✓</span> : <span className="badge-overdue">✗</span>}</td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-blue-400"><Icon name="Pencil" size={13} /></button>
                    <button onClick={() => del(p.id as number)} className="text-gray-300 hover:text-red-400"><Icon name="Trash2" size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {(sessions as []).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Нет тренировок</td></tr>}
          </tbody>
        </table>
      </div>
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editId ? "Редактировать" : "Новая тренировка"}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <select className={inputCls} value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
            {(students as Record<string, unknown>[]).map(s => <option key={s.id as number} value={String(s.id)}>{s.name as string}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            <input className={inputCls} type="number" placeholder="Минут" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))} />
            <input className={inputCls} type="number" placeholder="Стоимость ₽" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: +e.target.value }))} />
            <select className={inputCls} value={form.paid ? "1" : "0"} onChange={e => setForm(p => ({ ...p, paid: e.target.value === "1" }))}>
              <option value="1">Оплачено</option><option value="0">Не оплачено</option>
            </select>
          </div>
          <textarea className={inputCls} rows={2} placeholder="Заметка..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          <div className="flex gap-2 pt-1"><OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={saving}>{saving ? "..." : "Сохранить"}</PrimaryBtn></div>
        </form>
      </BottomSheet>
    </div>
  );
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
export function NotesSection({ user }: { user: AppUser }) {
  const qc = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({ queryKey: ["notes", user.id], queryFn: () => notesApi.list() });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", body: "", tags: "", important: false });
  const [saving, setSaving] = useState(false);

  const openEdit = (n: Record<string, unknown>) => { setEditId(n.id as number); setForm({ title: n.title as string, body: n.body as string || "", tags: n.tags as string || "", important: n.important as boolean }); setShowForm(true); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await notesApi.update(editId, form); else await notesApi.create(form);
      qc.invalidateQueries({ queryKey: ["notes"] }); setShowForm(false); setEditId(null); setForm({ title: "", body: "", tags: "", important: false });
    } finally { setSaving(false); }
  };
  const del = async (id: number) => { if (!window.confirm("Удалить заметку?")) return; await notesApi.remove(id); qc.invalidateQueries({ queryKey: ["notes"] }); };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><h1 className="section-title">Заметки</h1><PrimaryBtn onClick={() => { setEditId(null); setForm({ title: "", body: "", tags: "", important: false }); setShowForm(true); }}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn></div>
      {(notes as Record<string, unknown>[]).map(n => (
        <div key={n.id as number} className={`card-glass rounded-2xl p-4 border-l-2 ${n.important ? "border-l-red-500" : "border-l-gray-200"}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">{n.important && <span className="badge-overdue">Важно</span>}<h3 className="font-semibold text-sm">{n.title as string}</h3></div>
            <span className="text-[10px] text-gray-400">{(n.created_at as string)?.slice(0, 10)}</span>
          </div>
          {n.body && <p className="text-sm text-gray-500 mb-2 leading-relaxed">{(n.body as string).slice(0, 150)}</p>}
          {n.tags && <div className="flex flex-wrap gap-1 mb-2">{(n.tags as string).split(",").filter(t => t.trim()).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">#{t.trim()}</span>)}</div>}
          <div className="flex gap-3 mt-2">
            <button onClick={() => openEdit(n)} className="text-xs text-gray-400 hover:text-blue-500">✏️ Изменить</button>
            <button onClick={() => del(n.id as number)} className="text-xs text-gray-400 hover:text-red-500">🗑️ Удалить</button>
          </div>
        </div>
      ))}
      {(notes as []).length === 0 && <div className="text-center py-12 text-gray-400"><Icon name="FileText" size={40} className="mx-auto mb-2 opacity-20" /><p>Нет заметок</p></div>}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editId ? "Редактировать" : "Новая заметка"}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Заголовок *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <textarea className={inputCls} rows={4} placeholder="Текст..." value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
          <input className={inputCls} placeholder="Теги (через запятую)" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.important} onChange={e => setForm(p => ({ ...p, important: e.target.checked }))} className="accent-red-600 w-4 h-4" />Важная заметка</label>
          <div className="flex gap-2 pt-1"><OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={saving}>{saving ? "..." : "Сохранить"}</PrimaryBtn></div>
        </form>
      </BottomSheet>
    </div>
  );
}

// ─── REPORTS (TRAINER — NO REVENUE) ──────────────────────────────────────────

export function ReportsSection({ user, month }: { user: AppUser; month: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["reports", month, user.id], queryFn: () => reportsApi.get(month) });

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  const summary = data?.summary || {};
  const students: Record<string, unknown>[] = data?.students || [];

  const exportCsv = () => {
    const headers = ["Ученик", "Зал", "Группа", "Был/Всего", "Перс.", "%", "Оплата"];
    const rows = students.map(s => [s.name, s.hall, s.grp, `${s.present_count}/${s.total_days}`, s.personal_count, s.attendance_rate + "%", s.paid ? "Оплачен" : "Не оплачен"]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = `отчёт_${month}.csv`; a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><h1 className="section-title">Отчёты</h1><OutlineBtn onClick={exportCsv}>⬇ CSV</OutlineBtn></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{summary.total_students || 0}</div><div className="text-xs text-gray-400 mt-1">Всего</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{summary.paid_count || 0}</div><div className="text-xs text-gray-400 mt-1">Оплатили</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-red-500">{summary.unpaid_count || 0}</div><div className="text-xs text-gray-400 mt-1">Долг</div></div>
      </div>

      <div className="card-glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50"><th className="text-left px-3 py-2.5 text-xs text-gray-400 uppercase">Ученик</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Был/Всего</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Перс.</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">%</th><th className="text-center px-3 py-2.5 text-xs text-gray-400 uppercase">Опл.</th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id as number} className="border-t border-gray-50">
                <td className="px-3 py-2.5 font-semibold text-xs">{s.name as string}</td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{s.present_count as number}/{s.total_days as number}</td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{s.personal_count as number}</td>
                <td className="px-3 py-2.5 text-center text-xs"><span className={`font-bold ${(s.attendance_rate as number) >= 75 ? "text-green-600" : (s.attendance_rate as number) >= 50 ? "text-amber-500" : "text-red-500"}`}>{s.attendance_rate as number}%</span></td>
                <td className="px-3 py-2.5 text-center">{s.paid ? <span className="badge-paid">✓</span> : <span className="badge-overdue">✗</span>}</td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Нет данных</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}