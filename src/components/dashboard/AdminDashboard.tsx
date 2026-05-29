import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, studentsApi, attendanceApi, paymentsApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monStr  = () => new Date().toISOString().slice(0, 7);
const todayMMDD = () => new Date().toISOString().slice(5, 10);
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

// Простой CSS-бар прогресса
function MiniBar({ value, max, color = "hsl(0,72%,40%)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── ТРЕНЕРЫ ──────────────────────────────────────────────────────────────────
type EditForm = { full_name: string; hall: string; schedule: string; trainings_per_month: number; password: string };
const emptyEdit = (t: Record<string, unknown>): EditForm => ({
  full_name: t.full_name as string,
  hall: (t.hall as string) || "",
  schedule: (t.schedule as string) || "",
  trainings_per_month: (t.trainings_per_month as number) || 13,
  password: "",
});

function TrainersTab({ user }: { user: AppUser }) {
  const qc = useQueryClient();
  const { data: trainers = [], isLoading } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", hall: "", schedule: "", trainings_per_month: 13 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: "", hall: "", schedule: "", trainings_per_month: 13, password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  const togglePerm = async (id: number) => {
    setToggling(prev => new Set([...prev, id]));
    try { await authApi.togglePermission(id); qc.invalidateQueries({ queryKey: ["trainers"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      await authApi.register(form);
      qc.invalidateQueries({ queryKey: ["trainers"] });
      setShowForm(false);
      setForm({ username: "", password: "", full_name: "", hall: "", schedule: "", trainings_per_month: 13 });
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setEditErr(""); setEditSaving(true);
    try {
      await authApi.updateTrainer(editId!, editForm);
      qc.invalidateQueries({ queryKey: ["trainers"] });
      setEditId(null);
    } catch (ex: unknown) { setEditErr(ex instanceof Error ? ex.message : "Ошибка"); }
    finally { setEditSaving(false); }
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
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Зал (необязательно)" value={form.hall} onChange={e => setForm(p => ({ ...p, hall: e.target.value }))} />
              <input className={inputCls} placeholder="Расписание (пн/ср/пт 18:00)" value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Занятий в месяц:</label>
              <input type="number" min={1} max={31} className={inputCls} value={form.trainings_per_month} onChange={e => setForm(p => ({ ...p, trainings_per_month: +e.target.value }))} />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="flex gap-2"><OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : "Создать тренера"}</PrimaryBtn></div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(trainers as Record<string, unknown>[]).map(t => (
          <div key={t.id as number} className="card-glass rounded-xl p-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-oswald font-bold text-gray-500 flex-shrink-0">{ini(t.full_name as string)}</div>
            <div className="flex-1 min-w-0">
              {editId === (t.id as number) ? (
                <form onSubmit={saveEdit} className="flex flex-col gap-2">
                  <input className={inputCls} placeholder="ФИО *" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="Зал" value={editForm.hall} onChange={e => setEditForm(p => ({ ...p, hall: e.target.value }))} />
                    <input className={inputCls} placeholder="Расписание" value={editForm.schedule} onChange={e => setEditForm(p => ({ ...p, schedule: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500 whitespace-nowrap">Зан./мес:</label>
                      <input type="number" min={1} max={31} className={inputCls} value={editForm.trainings_per_month} onChange={e => setEditForm(p => ({ ...p, trainings_per_month: +e.target.value }))} />
                    </div>
                    <input className={inputCls} type="password" placeholder="Новый пароль" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  {editErr && <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{editErr}</div>}
                  <div className="flex gap-2"><OutlineBtn onClick={() => setEditId(null)}>Отмена</OutlineBtn><PrimaryBtn type="submit" disabled={editSaving}>{editSaving ? "..." : "Сохранить"}</PrimaryBtn></div>
                </form>
              ) : (
                <>
                  <div className="font-semibold text-sm">{t.full_name as string}</div>
                  <div className="text-xs text-gray-400">@{t.username as string}{t.hall ? ` · ${t.hall}` : ""}</div>
                  {t.schedule && <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Icon name="Clock" size={11} />{t.schedule as string}</div>}
                  <div className="text-[10px] text-gray-300 mt-0.5">с {(t.created_at as string)?.slice(0, 10)} · {t.trainings_per_month as number} зан./мес.</div>
                  <button onClick={() => togglePerm(t.id as number)} disabled={toggling.has(t.id as number)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-all disabled:opacity-50"
                    style={{ background: t.can_edit_journal ? "hsl(142,60%,93%)" : "hsl(0,0%,93%)", color: t.can_edit_journal ? "hsl(142,60%,30%)" : "hsl(0,0%,45%)" }}>
                    <Icon name={t.can_edit_journal ? "ShieldCheck" : "ShieldOff"} size={12} />
                    {t.can_edit_journal ? "Может вносить данные" : "Только просмотр"}
                  </button>
                </>
              )}
            </div>
            {editId !== (t.id as number) && (
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => { setEditId(t.id as number); setEditForm(emptyEdit(t)); setEditErr(""); }} className="text-gray-300 hover:text-blue-400 transition-colors p-1"><Icon name="Pencil" size={15} /></button>
                <button onClick={() => del(t.id as number, t.full_name as string)} disabled={deleting.has(t.id as number)} className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 p-1"><Icon name="Trash2" size={15} /></button>
              </div>
            )}
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
  const [showArchive, setShowArchive] = useState(false);
  const qc = useQueryClient();

  const today = todayStr();
  const todayMD = todayMMDD();

  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const enabled = selectedTrainer !== null;
  const { data: students = [], isLoading: sLoad } = useQuery({
    queryKey: ["students-admin", selectedTrainer],
    queryFn: () => studentsApi.list(selectedTrainer!),
    enabled,
  });
  const { data: archived = [] } = useQuery({
    queryKey: ["students-archived-admin", selectedTrainer],
    queryFn: () => studentsApi.listArchived(selectedTrainer!),
    enabled: enabled && showArchive,
  });
  const { data: attData = [] } = useQuery({ queryKey: ["att-admin", date, selectedTrainer], queryFn: () => attendanceApi.byDate(date, selectedTrainer!), enabled });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-admin", month, selectedTrainer], queryFn: () => paymentsApi.byMonth(month, selectedTrainer!), enabled });

  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const isPresent = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present);
  const isPaid = (sid: number) => (payData as Record<string, unknown>[]).some(p => p.student_id === sid && p.paid);
  const isBirthday = (s: Record<string, unknown>) => s.birthdate && (s.birthdate as string).slice(5) === todayMD;
  const isCertOk = (s: Record<string, unknown>) => s.cert_to && (s.cert_to as string) >= today;
  const isInsOk = (s: Record<string, unknown>) => s.insurance && s.insurance_to && (s.insurance_to as string) >= today;

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
      <div className="flex items-center justify-between">
        <h1 className="section-title">Данные</h1>
        {enabled && (
          <button onClick={() => setShowArchive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showArchive ? "border-orange-300 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-500"}`}>
            <Icon name="Archive" size={13} />Архив
          </button>
        )}
      </div>

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
          {/* Стат. карточки */}
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{(students as []).length}</div><div className="text-xs text-gray-400">Учеников</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{(students as Record<string, unknown>[]).filter(s => isPresent(s.id as number)).length}</div><div className="text-xs text-gray-400">Сегодня</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(students as Record<string, unknown>[]).filter(s => isPaid(s.id as number)).length}</div><div className="text-xs text-gray-400">Оплатили</div></div>
          </div>

          {/* Список активных учеников */}
          <div className="flex flex-col gap-2">
            {(students as Record<string, unknown>[]).map(s => {
              const sid = s.id as number;
              const here = isPresent(sid);
              const paid = isPaid(sid);
              const birthday = isBirthday(s);
              const certOk = isCertOk(s);
              const insOk = isInsOk(s);
              return (
                <div key={sid}
                  className={`card-glass rounded-xl p-3 border-l-2 ${birthday ? "border-l-yellow-400" : paid ? "border-l-green-500" : "border-l-red-400"}`}
                  style={birthday ? { background: "linear-gradient(135deg,#fffbeb 0%,#fff 60%)" } : undefined}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-oswald font-bold flex-shrink-0 ${birthday ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                      {birthday ? "🎂" : ini(s.name as string)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate flex items-center gap-1">
                        {s.name as string}
                        {birthday && <span className="text-[10px]">🎉</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {[s.hall, s.hall2, s.grp].filter(Boolean).join(" · ")}
                      </div>
                      {s.birthdate && (
                        <div className="text-[10px] text-gray-300 flex items-center gap-1">
                          <Icon name="Cake" size={10} />{(s.birthdate as string).split("-").reverse().join(".")}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.cert_to
                          ? (certOk ? <span className="badge-present text-[9px]">✓ Справка</span> : <span className="badge-absent text-[9px]">Справка просрочена</span>)
                          : <span className="badge-absent text-[9px]">Нет справки</span>}
                        {s.insurance
                          ? (insOk ? <span className="badge-present text-[9px]">✓ Страховка</span> : <span className="badge-absent text-[9px]">Страховка просрочена</span>)
                          : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => togglePay(sid, paid)} disabled={toggling.has(`p${sid}`)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${paid ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-500 hover:border-red-300"}`}>
                      {paid ? "✓ Оплачен (снять)" : "💰 Оплатить"}
                    </button>
                    <button onClick={() => toggleAtt(sid, here)} disabled={toggling.has(`a${sid}`)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${here ? "bg-green-50 border-green-200 text-green-700" : "border-red-50 border-red-200 text-red-500 hover:border-red-300"}`}>
                      {here ? "✅ Был (снять)" : <span style={{ color: "hsl(0,72%,40%)" }}>● Отметить</span>}
                    </button>
                  </div>
                </div>
              );
            })}
            {(students as []).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Icon name="Users" size={32} className="mx-auto mb-2 opacity-20" />Нет учеников
              </div>
            )}
          </div>

          {/* Архив */}
          {showArchive && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="px-3 py-2 bg-orange-50 border-b border-orange-100">
                <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide flex items-center gap-1">
                  <Icon name="Archive" size={12} />Архив ({(archived as []).length})
                </div>
              </div>
              {(archived as Record<string, unknown>[]).length === 0
                ? <div className="text-center py-6 text-gray-400 text-xs">Архив пуст</div>
                : (archived as Record<string, unknown>[]).map(s => (
                  <div key={s.id as number} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-500">{s.name as string}</div>
                        <div className="text-xs text-gray-400">{[s.hall, s.grp].filter(Boolean).join(" · ")}</div>
                        {s.archive_reason && <div className="text-xs text-orange-400 mt-0.5">Причина: {s.archive_reason as string}</div>}
                      </div>
                      <div className="text-[10px] text-gray-300 whitespace-nowrap">
                        {s.archived_at ? new Date(s.archived_at as string).toLocaleDateString("ru") : ""}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ОТЧЁТЫ (ADMIN) ────────────────────────────────────────────────────────────
function ReportsTab() {
  const [month, setMonth] = useState(monStr());
  const [trainerId, setTrainerId] = useState<number | null>(null);
  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const { data, isLoading } = useQuery({ queryKey: ["reports-admin", month, trainerId], queryFn: () => reportsApi.get(month, trainerId ?? undefined) });

  const summary = data?.summary || {};
  const students: Record<string, unknown>[] = data?.students || [];
  const trainerRows: Record<string, unknown>[] = data?.trainers || [];

  const exportCsv = () => {
    const headers = trainerId
      ? ["Ученик", "Зал", "Зал 2", "Группа", "Был/Всего", "Перс.", "%", "Оплата", "Абонемент ₽"]
      : ["Тренер", "Зал", "Учеников", "Абонементы ₽", "Персональные ₽", "Итого ₽"];
    const rows = trainerId
      ? students.map(s => [s.name, s.hall, s.hall2 || "", s.grp, `${s.present_count}/${s.total_days}`, s.personal_count, s.attendance_rate + "%", s.paid ? "Оплачен" : "Не оплачен", s.paid ? s.fee : 0])
      : trainerRows.map(t => [t.full_name, t.hall, t.student_count, t.subs_rev, t.pers_rev, t.total_rev]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = `отчёт_${month}.csv`; a.click();
  };

  // Максимум для CSS-баров
  const maxRev = Math.max(...trainerRows.map(t => t.total_rev as number), 1);
  const maxPct = 100;

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
          {/* Итоговые карточки */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{summary.total_students || 0}</div><div className="text-xs text-gray-400">Учеников</div></div>
            <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{summary.paid_count || 0}</div><div className="text-xs text-gray-400">Оплатили</div></div>
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

          {/* Таблица по тренерам с CSS-барами */}
          {!trainerId && trainerRows.length > 0 && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">По тренерам</span>
              </div>
              <div className="divide-y divide-gray-50">
                {trainerRows.map(t => (
                  <div key={t.id as number} className="px-3 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{t.full_name as string}</span>
                      <span className="font-oswald font-bold text-sm" style={{ color: "hsl(0,72%,40%)" }}>{(t.total_rev as number).toLocaleString()} ₽</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{t.student_count as number} уч. · абон. {(t.subs_rev as number).toLocaleString()} ₽ · перс. {(t.pers_rev as number).toLocaleString()} ₽</div>
                    <MiniBar value={t.total_rev as number} max={maxRev} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Таблица по ученикам с CSS-барами посещаемости */}
          {trainerId && students.length > 0 && (
            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ученики</span>
              </div>
              <div className="divide-y divide-gray-50">
                {students.map(s => {
                  const pct = s.attendance_rate as number;
                  const pctColor = pct >= 75 ? "hsl(142,60%,40%)" : pct >= 50 ? "hsl(38,90%,45%)" : "hsl(0,72%,40%)";
                  return (
                    <div key={s.id as number} className="px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold">{s.name as string}</span>
                          <span className="text-xs text-gray-400 ml-2">{[s.hall, s.hall2].filter(Boolean).join("+")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{s.present_count as number}/{s.total_days as number}</span>
                          <span className="font-bold text-xs" style={{ color: pctColor }}>{pct}%</span>
                          {s.paid ? <span className="badge-paid text-[9px]">✓</span> : <span className="badge-overdue text-[9px]">✗</span>}
                        </div>
                      </div>
                      <MiniBar value={pct} max={maxPct} color={pctColor} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {students.length === 0 && trainerRows.length === 0 && !isLoading && (
            <div className="text-center py-10 text-gray-400 text-sm">Нет данных за этот месяц</div>
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
      {/* Навбар вкладок */}
      <div className="sticky top-[88px] z-20 bg-white border-b border-gray-100 flex">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all"
              style={{ color: active ? "hsl(0,72%,40%)" : "hsl(0,0%,52%)", borderBottom: active ? "2px solid hsl(0,72%,40%)" : "2px solid transparent" }}>
              <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={17} />
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "trainers" && <TrainersTab user={user} />}
      {tab === "data"     && <DataTab />}
      {tab === "reports"  && <ReportsTab />}
    </div>
  );
}
