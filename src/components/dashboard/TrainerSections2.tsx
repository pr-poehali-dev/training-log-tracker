import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, personalApi, notesApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";
import PushToggle from "@/components/shared/PushToggle";

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
      <div className="flex items-center justify-between">
        <h1 className="section-title">ПЕРСОНАЛ</h1>
        <PrimaryBtn onClick={openAdd}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>

      {/* Статы */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(sessions as []).length}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Тренировок</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{totalRev.toLocaleString()} ₽</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Выручка</div>
        </div>
      </div>

      {/* Список тренировок */}
      {(sessions as Record<string, unknown>[]).map(p => (
        <div key={p.id as number} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
          <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 70, zIndex: 0 }}>
            <img src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
              alt="" style={{ position: "absolute", width: 80, height: 80, opacity: 0.04, right: -8, top: "50%", transform: "translateY(-50%)", objectFit: "contain", filter: "grayscale(1)" }} />
          </div>
          <div className="p-3 flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-oswald font-bold text-gray-500 flex-shrink-0">
              {ini(p.name as string)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-gray-900">{p.name as string}</div>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1"><Icon name="CalendarDays" size={10} />{(p.date as string).slice(5)}</span>
                <span className="flex items-center gap-1"><Icon name="Clock" size={10} />{p.duration as number} мин</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-oswald font-bold text-sm" style={{ color: "hsl(142,55%,38%)" }}>{(p.cost as number).toLocaleString()} ₽</span>
              {p.paid
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>✓ Оплачено</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,50%)" }}>Не оплачено</span>}
            </div>
          </div>
          <div className="flex border-t border-gray-100 relative z-10">
            <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
              <Icon name="Pencil" size={12} />Изменить
            </button>
            <button onClick={() => del(p.id as number)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold hover:bg-red-50 transition-colors" style={{ color: "hsl(0,72%,50%)" }}>
              <Icon name="Trash2" size={12} />Удалить
            </button>
          </div>
        </div>
      ))}

      {(sessions as []).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="User" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Нет персональных тренировок</p>
        </div>
      )}

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
      <div className="flex items-center justify-between">
        <h1 className="section-title">ЗАМЕТКИ</h1>
        <PrimaryBtn onClick={() => { setEditId(null); setForm({ title: "", body: "", tags: "", important: false }); setShowForm(true); }}>
          <Icon name="Plus" size={15} className="inline mr-1" />Добавить
        </PrimaryBtn>
      </div>

      <PushToggle />

      {(notes as Record<string, unknown>[]).map(n => (
        <div key={n.id as number} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className={`h-1 w-full ${n.important ? "" : "bg-gray-100"}`}
            style={n.important ? { background: "hsl(0,72%,40%)" } : undefined} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                {n.important && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,40%)" }}>Важно</span>
                )}
                <h3 className="font-semibold text-sm text-gray-900">{n.title as string}</h3>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{(n.created_at as string)?.slice(0, 10)}</span>
            </div>
            {n.body && <p className="text-sm text-gray-500 mb-2 leading-relaxed">{(n.body as string).slice(0, 150)}</p>}
            {n.tags && (
              <div className="flex flex-wrap gap-1 mb-2">
                {(n.tags as string).split(",").filter(t => t.trim()).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{t.trim()}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex border-t border-gray-100">
            <button onClick={() => openEdit(n)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
              <Icon name="Pencil" size={12} />Изменить
            </button>
            <button onClick={() => del(n.id as number)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold hover:bg-red-50 transition-colors" style={{ color: "hsl(0,72%,50%)" }}>
              <Icon name="Trash2" size={12} />Удалить
            </button>
          </div>
        </div>
      ))}

      {(notes as []).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="FileText" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Нет заметок</p>
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editId ? "Редактировать" : "Новая заметка"}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Заголовок *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <textarea className={inputCls} rows={4} placeholder="Текст..." value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
          <input className={inputCls} placeholder="Теги (через запятую)" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.important} onChange={e => setForm(p => ({ ...p, important: e.target.checked }))} className="accent-red-600 w-4 h-4" />
            Важная заметка
          </label>
          <div className="flex gap-2 pt-1"><OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={saving}>{saving ? "..." : "Сохранить"}</PrimaryBtn></div>
        </form>
      </BottomSheet>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
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
      <div className="flex items-center justify-between">
        <h1 className="section-title">ОТЧЁТЫ</h1>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
          <Icon name="Download" size={13} />CSV
        </button>
      </div>

      {/* Статы */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold text-gray-700">{summary.total_students || 0}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Всего</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{summary.paid_count || 0}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Оплатили</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{summary.unpaid_count || 0}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Должники</div>
        </div>
      </div>

      {/* Карточки учеников */}
      {students.map(s => {
        const rate = s.attendance_rate as number;
        const isGood = rate >= 75;
        const isMid = rate >= 50;
        const rateColor = isGood ? "hsl(142,55%,38%)" : isMid ? "hsl(38,85%,40%)" : "hsl(0,72%,40%)";

        return (
          <div key={s.id as number} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
            <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 70, zIndex: 0 }}>
              <img src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
                alt="" style={{ position: "absolute", width: 80, height: 80, opacity: 0.04, right: -8, top: "50%", transform: "translateY(-50%)", objectFit: "contain", filter: "grayscale(1)" }} />
            </div>
            <div className="p-3 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-oswald font-bold text-gray-500 flex-shrink-0">
                {ini(s.name as string)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] text-gray-900 truncate">{s.name as string}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Был: {s.present_count as number}/{s.total_days as number} · Перс: {s.personal_count as number}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, rate)}%`, background: rateColor }} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-oswald font-bold text-base" style={{ color: rateColor }}>{rate}%</span>
                {s.paid
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>✓</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,50%)" }}>✗</span>}
              </div>
            </div>
          </div>
        );
      })}

      {students.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="BarChart2" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Нет данных за этот месяц</p>
        </div>
      )}
    </div>
  );
}
