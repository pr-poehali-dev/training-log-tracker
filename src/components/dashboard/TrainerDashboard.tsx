import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, attendanceApi, paymentsApi, personalApi, notesApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monStr = () => new Date().toISOString().slice(0, 7);
const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";

function PrimaryBtn({ children, onClick, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
      style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>
      {children}
    </button>
  );
}
function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}

function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}
function ErrBlock({ msg }: { msg: string }) {
  return <div className="text-center py-8 text-red-500 text-sm">{msg}</div>;
}

function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 py-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="font-oswald text-lg font-bold tracking-wide mb-4" style={{ color: "hsl(0,72%,40%)" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────
function StudentsSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const qc = useQueryClient();
  const { data: students = [], isLoading, error } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attData = [] } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", hall: "", grp: "", phone: "", iko: "", fee: 3000, lvl: "", cert: false, cert_from: "", cert_to: "" });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  const today = todayStr();
  const isPresent = (sid: number) => attData.some((a: Record<string, unknown>) => a.student_id === sid && a.present);
  const isPaid = (sid: number) => payData.some((p: Record<string, unknown>) => p.student_id === sid && p.paid);
  const isCertOk = (s: Record<string, unknown>) => s.cert && s.cert_to && (s.cert_to as string) >= today;

  const markAtt = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await attendanceApi.mark({ student_id: sid, date, present: true }); qc.invalidateQueries({ queryKey: ["att-date"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };
  const markPay = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await paymentsApi.mark({ student_id: sid, month, paid: true }); qc.invalidateQueries({ queryKey: ["pay-month"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };
  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await studentsApi.create(form); qc.invalidateQueries({ queryKey: ["students"] }); setShowAdd(false); setForm({ name: "", hall: "", grp: "", phone: "", iko: "", fee: 3000, lvl: "", cert: false, cert_from: "", cert_to: "" }); }
    finally { setSaving(false); }
  };
  const deleteStudent = async (id: number, name: string) => {
    if (!window.confirm(`Удалить "${name}"?`)) return;
    await studentsApi.remove(id); qc.invalidateQueries({ queryKey: ["students"] });
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Ученики</h1>
        <PrimaryBtn onClick={() => setShowAdd(true)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>
      {students.length === 0 && <div className="text-center py-12 text-gray-400"><Icon name="Users" size={40} className="mx-auto mb-2 opacity-30" /><p>Нет учеников</p></div>}
      {(students as Record<string, unknown>[]).map(s => {
        const sid = s.id as number;
        const here = isPresent(sid);
        const paid = isPaid(sid);
        const certOk = isCertOk(s);
        const t = toggling.has(sid);
        return (
          <div key={sid} className={`card-glass rounded-2xl overflow-hidden border-l-2 ${paid ? "border-l-green-500" : "border-l-red-400"}`}>
            <div className="p-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-oswald font-bold text-gray-500 flex-shrink-0">{ini(s.name as string)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.name as string}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.hall as string} · {s.grp as string} · {s.lvl as string}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.cert ? (certOk ? <span className="badge-present">✓ Справка</span> : <span className="badge-absent">Просрочена</span>) : <span className="badge-absent">Нет справки</span>}
                  {here ? <span className="badge-present">✅ Был</span> : <span className="badge-absent">❌ Нет</span>}
                  {paid ? <span className="badge-paid">💰 Оплачен</span> : <span className="badge-overdue">✗ Не оплачен</span>}
                </div>
              </div>
              <button onClick={() => deleteStudent(sid, s.name as string)} className="text-gray-300 hover:text-red-400 transition-colors mt-1">
                <Icon name="Trash2" size={14} />
              </button>
            </div>
            <div className="flex border-t border-gray-100">
              <div className="flex-1 py-2 text-center">
                {here ? <span className="text-xs text-green-600 font-semibold">✓ Посещение отмечено</span>
                  : <button disabled={t} onClick={() => markAtt(sid)} className="text-xs font-semibold transition-colors" style={{ color: "hsl(0,72%,40%)" }}>{t ? "..." : "✅ Отметить"}</button>}
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 py-2 text-center">
                {paid ? <span className="text-xs text-green-600 font-semibold">✓ Оплата отмечена</span>
                  : <button disabled={t} onClick={() => markPay(sid)} className="text-xs font-semibold" style={{ color: "hsl(28,85%,42%)" }}>{t ? "..." : "💰 Оплатить"}</button>}
              </div>
            </div>
          </div>
        );
      })}

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Новый ученик">
        <form onSubmit={addStudent} className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Имя *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Зал" value={form.hall} onChange={e => setForm(p => ({ ...p, hall: e.target.value }))} />
            <input className={inputCls} placeholder="Группа" value={form.grp} onChange={e => setForm(p => ({ ...p, grp: e.target.value }))} />
            <input className={inputCls} placeholder="Телефон" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            <input className={inputCls} placeholder="IKO карта" value={form.iko} onChange={e => setForm(p => ({ ...p, iko: e.target.value }))} />
            <input className={inputCls} placeholder="Абонемент ₽" type="number" value={form.fee} onChange={e => setForm(p => ({ ...p, fee: +e.target.value }))} />
            <input className={inputCls} placeholder="Уровень" value={form.lvl} onChange={e => setForm(p => ({ ...p, lvl: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.cert} onChange={e => setForm(p => ({ ...p, cert: e.target.checked }))} className="accent-red-600 w-4 h-4" />Медицинская справка</label>
          {form.cert && (
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} type="date" value={form.cert_from} onChange={e => setForm(p => ({ ...p, cert_from: e.target.value }))} />
              <input className={inputCls} type="date" value={form.cert_to} onChange={e => setForm(p => ({ ...p, cert_to: e.target.value }))} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <OutlineBtn onClick={() => setShowAdd(false)}>Отмена</OutlineBtn>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</PrimaryBtn>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
function PaymentsSection({ user, month }: { user: AppUser; month: string }) {
  const qc = useQueryClient();
  const { data: payData = [], isLoading } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  const paidCount = (payData as Record<string, unknown>[]).filter(p => p.paid).length;
  const total = payData.length;
  const revenue = (payData as Record<string, unknown>[]).filter(p => p.paid).reduce((s, p) => s + (p.fee as number || 0), 0);

  const markPay = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await paymentsApi.mark({ student_id: sid, month, paid: true }); qc.invalidateQueries({ queryKey: ["pay-month"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">Оплаты</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{paidCount}</div><div className="text-xs text-gray-400 mt-1">Оплатили</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-red-500">{total - paidCount}</div><div className="text-xs text-gray-400 mt-1">Не оплатили</div></div>
      </div>
      <div className="flex flex-col gap-2">
        {[...(payData as Record<string, unknown>[])].sort((a, b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0)).map(p => {
          const sid = p.student_id as number;
          const t = toggling.has(sid);
          return (
            <div key={sid} className={`card-glass rounded-xl p-3 flex items-center gap-3 border-l-2 ${p.paid ? "border-l-green-500" : "border-l-red-400"}`}>
              <div className="flex-1"><div className="font-semibold text-sm">{p.name as string}</div><div className="text-xs text-gray-400">{p.fee as number} ₽</div></div>
              {p.paid ? <span className="badge-paid">✓ Оплачен</span>
                : <button disabled={t} onClick={() => markPay(sid)} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>{t ? "..." : "Оплатить"}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
function AttendanceSection({ user, date }: { user: AppUser; date: string }) {
  const qc = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attData = [], isLoading } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  const isPresent = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present);
  const presentCount = (students as Record<string, unknown>[]).filter(s => isPresent(s.id as number)).length;

  const markAtt = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await attendanceApi.mark({ student_id: sid, date, present: true }); qc.invalidateQueries({ queryKey: ["att-date"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">Посещения</h1>
      <div className="stat-card">
        <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-500">Присутствуют</span><span className="font-oswald text-lg font-bold" style={{ color: "hsl(0,72%,40%)" }}>{presentCount} / {(students as []).length}</span></div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(students as []).length ? (presentCount / (students as []).length * 100) : 0}%`, background: "hsl(0,72%,40%)" }} /></div>
      </div>
      <div className="card-glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2.5 text-xs text-gray-400 uppercase tracking-wider">Ученик</th><th className="text-left px-4 py-2.5 text-xs text-gray-400 uppercase tracking-wider">Группа</th><th className="text-center px-4 py-2.5 text-xs text-gray-400 uppercase tracking-wider">Статус</th></tr></thead>
          <tbody>
            {(students as Record<string, unknown>[]).map(s => {
              const sid = s.id as number;
              const here = isPresent(sid);
              const t = toggling.has(sid);
              return (
                <tr key={sid} className="border-t border-gray-50">
                  <td className="px-4 py-2.5 font-semibold">{s.name as string}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{s.grp as string}</td>
                  <td className="px-4 py-2.5 text-center">
                    {here ? <span className="badge-present">✓ Был</span>
                      : <button disabled={t} onClick={() => markAtt(sid)} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>{t ? "..." : "Отметить"}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PERSONAL ─────────────────────────────────────────────────────────────────
function PersonalSection({ user, month }: { user: AppUser; month: string }) {
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
function NotesSection({ user }: { user: AppUser }) {
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
interface TooltipP { active?: boolean; payload?: {color:string;value:number;dataKey:string}[]; label?: string }
const ChartTip = ({ active, payload, label }: TooltipP) => {
  if (!active || !payload?.length) return null;
  return <div className="card-glass rounded-xl p-2 border border-gray-200 shadow text-xs"><p className="text-gray-400 mb-1">{label}</p>{payload.map(p => <p key={p.dataKey} style={{ color: p.color }} className="font-bold">{p.value}%</p>)}</div>;
};

function ReportsSection({ user, month }: { user: AppUser; month: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["reports", month, user.id], queryFn: () => reportsApi.get(month) });

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  const summary = data?.summary || {};
  const students: Record<string, unknown>[] = data?.students || [];
  const chartData = students.map(s => ({ name: ini(s.name as string), pct: s.attendance_rate as number }));

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
      {chartData.length > 0 && (
        <div className="card-glass rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Посещаемость %</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="pct" fill="hsl(0,72%,40%)" radius={[4, 4, 0, 0]} name="%" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
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

// ─── ROOT ──────────────────────────────────────────────────────────────────────
type Tab = "students" | "payments" | "attendance" | "personal" | "notes" | "reports";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "students", label: "Ученики", icon: "BookOpen" },
  { id: "payments", label: "Оплаты", icon: "CreditCard" },
  { id: "attendance", label: "Посещ.", icon: "CalendarCheck" },
  { id: "personal", label: "Перс.", icon: "User" },
  { id: "notes", label: "Заметки", icon: "FileText" },
  { id: "reports", label: "Отчёты", icon: "BarChart3" },
];

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());

  return (
    <div className="flex flex-col">
      {/* Date/Month pickers */}
      {(tab === "students" || tab === "attendance") && (
        <div className="px-4 pt-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1" /></div>
      )}
      {(tab === "payments" || tab === "personal" || tab === "reports") && (
        <div className="px-4 pt-3"><input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1" /></div>
      )}

      <div className="px-4 py-3 pb-24">
        {tab === "students"   && <StudentsSection   user={user} date={date} month={month} />}
        {tab === "payments"   && <PaymentsSection   user={user} month={month} />}
        {tab === "attendance" && <AttendanceSection user={user} date={date} />}
        {tab === "personal"   && <PersonalSection   user={user} month={month} />}
        {tab === "notes"      && <NotesSection      user={user} />}
        {tab === "reports"    && <ReportsSection    user={user} month={month} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around" style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.07)", paddingBottom: "env(safe-area-inset-bottom,0px)", minHeight: 60 }}>
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
