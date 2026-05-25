import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, attendanceApi, paymentsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export function StudentsSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const qc = useQueryClient();
  const { data: students = [], isLoading, error } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attData = [] } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", hall: user.hall || "", grp: "", schedule: user.schedule || "", phone: "", iko: "", fee: 3000, lvl: "", cert: false, cert_from: "", cert_to: "" });
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
    try { await studentsApi.create(form); qc.invalidateQueries({ queryKey: ["students"] }); setShowAdd(false); setForm({ name: "", hall: user.hall || "", grp: "", schedule: user.schedule || "", phone: "", iko: "", fee: 3000, lvl: "", cert: false, cert_from: "", cert_to: "" }); }
    finally { setSaving(false); }
  };
  const deleteStudent = async (id: number, name: string) => {
    if (!window.confirm(`Удалить "${name}"?`)) return;
    await studentsApi.remove(id); qc.invalidateQueries({ queryKey: ["students"] });
  };

  const uniq = (field: string) => [...new Set((students as Record<string, unknown>[]).map(s => s[field] as string).filter(Boolean))];
  const halls = uniq("hall");
  const grps = uniq("grp");
  const schedules = uniq("schedule");

  const canEdit = user.role === "admin" || user.can_edit_journal !== false;

  const [search, setSearch] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");

  const filtered = (students as Record<string, unknown>[]).filter(s => {
    const q = search.toLowerCase();
    if (q && !(s.name as string)?.toLowerCase().includes(q)) return false;
    if (filterGrp && s.grp !== filterGrp) return false;
    if (filterHall && s.hall !== filterHall) return false;
    return true;
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Ученики <span className="text-gray-400 font-normal text-sm">({filtered.length})</span></h1>
        <PrimaryBtn onClick={() => setShowAdd(true)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-8`} placeholder="Поиск по имени..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Icon name="X" size={13} /></button>}
        </div>
        {(grps.length > 1 || halls.length > 1) && (
          <div className="flex gap-2">
            {grps.length > 1 && (
              <select className={`${inputCls} flex-1`} value={filterGrp} onChange={e => setFilterGrp(e.target.value)}>
                <option value="">Все группы</option>
                {grps.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {halls.length > 1 && (
              <select className={`${inputCls} flex-1`} value={filterHall} onChange={e => setFilterHall(e.target.value)}>
                <option value="">Все залы</option>
                {halls.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold">
          <Icon name="ShieldOff" size={13} />
          Просмотр — внесение данных заблокировано администратором
        </div>
      )}

      {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><Icon name="Users" size={40} className="mx-auto mb-2 opacity-30" /><p>{students.length === 0 ? "Нет учеников" : "Ничего не найдено"}</p></div>}
      {filtered.map(s => {
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
                {s.schedule && <div className="text-xs text-gray-400 flex items-center gap-1"><Icon name="Clock" size={11} />{s.schedule as string}</div>}
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
                {here
                  ? <span className="text-xs text-green-600 font-semibold">✓ Посещение отмечено</span>
                  : canEdit
                    ? <button disabled={t} onClick={() => markAtt(sid)} className="text-xs font-semibold transition-colors" style={{ color: "hsl(0,72%,40%)" }}>{t ? "..." : "✅ Отметить"}</button>
                    : <span className="text-xs text-gray-300">—</span>}
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 py-2 text-center">
                {paid
                  ? <span className="text-xs text-green-600 font-semibold">✓ Оплата отмечена</span>
                  : canEdit
                    ? <button disabled={t} onClick={() => markPay(sid)} className="text-xs font-semibold" style={{ color: "hsl(28,85%,42%)" }}>{t ? "..." : "💰 Оплатить"}</button>
                    : <span className="text-xs text-gray-300">—</span>}
              </div>
            </div>
          </div>
        );
      })}

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Новый ученик">
        <datalist id="dl-halls">{halls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-grps">{grps.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-schedules">{schedules.map(v => <option key={v} value={v} />)}</datalist>
        <form onSubmit={addStudent} className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Имя *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Зал" list="dl-halls" value={form.hall} onChange={e => setForm(p => ({ ...p, hall: e.target.value }))} />
            <input className={inputCls} placeholder="Группа" list="dl-grps" value={form.grp} onChange={e => setForm(p => ({ ...p, grp: e.target.value }))} />
            <input className={inputCls} placeholder="Время группы (пн/ср 18:00)" list="dl-schedules" value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))} />
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
export function PaymentsSection({ user, month }: { user: AppUser; month: string }) {
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
export function AttendanceSection({ user, date }: { user: AppUser; date: string }) {
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