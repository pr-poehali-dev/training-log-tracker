import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";
const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

function PrimaryBtn({ children, onClick, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50" style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>{children}</button>;
}
function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">{children}</button>;
}
function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

type EditForm = { full_name: string; hall: string; schedule: string; trainings_per_month: number; password: string; birthdate: string };
const emptyEdit = (t: Record<string, unknown>): EditForm => ({
  full_name: t.full_name as string,
  hall: (t.hall as string) || "",
  schedule: (t.schedule as string) || "",
  trainings_per_month: (t.trainings_per_month as number) || 13,
  password: "",
  birthdate: (t.birthdate as string) || "",
});

type SvEditForm = { full_name: string; password: string };

function SupervisorsSection() {
  const qc = useQueryClient();
  const { data: supervisors = [], isLoading } = useQuery({ queryKey: ["supervisors"], queryFn: () => authApi.supervisors() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SvEditForm>({ full_name: "", password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      await authApi.registerSupervisor(form);
      qc.invalidateQueries({ queryKey: ["supervisors"] });
      setShowForm(false);
      setForm({ username: "", password: "", full_name: "" });
    } catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setEditErr(""); setEditSaving(true);
    try {
      await authApi.updateSupervisor(editId!, editForm);
      qc.invalidateQueries({ queryKey: ["supervisors"] });
      setEditId(null);
    } catch (ex: unknown) { setEditErr(ex instanceof Error ? ex.message : "Ошибка"); }
    finally { setEditSaving(false); }
  };

  const del = async (id: number, name: string) => {
    if (!window.confirm(`Удалить наблюдателя "${name}"?`)) return;
    setDeleting(prev => new Set([...prev, id]));
    try { await authApi.deleteSupervisor(id); qc.invalidateQueries({ queryKey: ["supervisors"] }); }
    finally { setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const svList = supervisors as Record<string, unknown>[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-oswald text-base font-bold tracking-wide text-gray-700">
          НАБЛЮДАТЕЛИ <span className="text-gray-400 font-golos font-normal text-sm">({svList.length})</span>
        </h2>
        <PrimaryBtn onClick={() => setShowForm(!showForm)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>
      <p className="text-xs text-gray-400 -mt-1">Видит журнал посещаемости всех тренеров, но не видит оплаты и финансовые отчёты.</p>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-oswald text-base font-bold mb-3" style={{ color: "hsl(0,72%,40%)" }}>Новый наблюдатель</h3>
          <form onSubmit={save} className="flex flex-col gap-3">
            <input className={inputCls} placeholder="ФИО *" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Логин *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
              <input className={inputCls} type="password" placeholder="Пароль *" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="flex gap-2">
              <OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn>
              <PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : "Создать"}</PrimaryBtn>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <Loading /> : (
        <div className="flex flex-col gap-2">
          {svList.map(sv => {
            const sid = sv.id as number;
            return (
              <div key={sid} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-oswald font-bold text-sm flex-shrink-0"
                  style={{ background: "hsl(210,60%,96%)", color: "hsl(210,60%,42%)" }}>
                  {ini(sv.full_name as string)}
                </div>
                <div className="flex-1 min-w-0">
                  {editId === sid ? (
                    <form onSubmit={saveEdit} className="flex flex-col gap-2">
                      <input className={inputCls} placeholder="ФИО *" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} required />
                      <input className={inputCls} type="password" placeholder="Новый пароль (необязательно)" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
                      {editErr && <div className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{editErr}</div>}
                      <div className="flex gap-2">
                        <OutlineBtn onClick={() => setEditId(null)}>Отмена</OutlineBtn>
                        <PrimaryBtn type="submit" disabled={editSaving}>{editSaving ? "..." : "Сохранить"}</PrimaryBtn>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="font-bold text-[13px] text-gray-900">{sv.full_name as string}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">@{sv.username as string}</div>
                    </>
                  )}
                </div>
                {editId !== sid && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => { setEditId(sid); setEditForm({ full_name: sv.full_name as string, password: "" }); setEditErr(""); }}
                      className="text-gray-300 hover:text-blue-400 transition-colors p-1">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => del(sid, sv.full_name as string)} disabled={deleting.has(sid)}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 p-1">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {svList.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Icon name="Eye" size={32} className="mx-auto mb-2 opacity-20" />
              Нет наблюдателей
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTrainersTab({ user }: { user: AppUser }) {
  const qc = useQueryClient();
  const { data: trainers = [], isLoading } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", hall: "", schedule: "", trainings_per_month: 13, birthdate: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: "", hall: "", schedule: "", trainings_per_month: 13, password: "", birthdate: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [search, setSearch] = useState("");

  const todayMD = new Date().toISOString().slice(5, 10);

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
      setForm({ username: "", password: "", full_name: "", hall: "", schedule: "", trainings_per_month: 13, birthdate: "" });
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
    if (!window.confirm(`Удалить тренера "${name}"?`)) return;
    setDeleting(prev => new Set([...prev, id]));
    try { await authApi.deleteTrainer(id); qc.invalidateQueries({ queryKey: ["trainers"] }); }
    finally { setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const trainerList = (trainers as Record<string, unknown>[])
    .filter(t => !search || (t.full_name as string)?.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <Loading />;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="section-title">ТРЕНЕРЫ <span className="text-gray-400 font-golos font-normal text-sm">({(trainers as []).length})</span></h1>
        <PrimaryBtn onClick={() => setShowForm(!showForm)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition"
          placeholder="Поиск по имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Icon name="X" size={14} /></button>}
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-oswald text-base font-bold mb-3" style={{ color: "hsl(0,72%,40%)" }}>Новый тренер</h2>
          <form onSubmit={save} className="flex flex-col gap-3">
            <input className={inputCls} placeholder="ФИО *" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Логин *" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
              <input className={inputCls} type="password" placeholder="Пароль *" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Зал" value={form.hall} onChange={e => setForm(p => ({ ...p, hall: e.target.value }))} />
              <input className={inputCls} placeholder="Расписание" value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-gray-400 mb-1">Занятий в месяц</div>
                <input type="number" min={1} max={31} className={inputCls} value={form.trainings_per_month} onChange={e => setForm(p => ({ ...p, trainings_per_month: +e.target.value }))} />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 mb-1">Дата рождения</div>
                <input type="date" className={inputCls} value={form.birthdate} onChange={e => setForm(p => ({ ...p, birthdate: e.target.value }))} />
              </div>
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="flex gap-2">
              <OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn>
              <PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : "Создать тренера"}</PrimaryBtn>
            </div>
          </form>
        </div>
      )}

      {/* Список тренеров */}
      <div className="flex flex-col gap-2">
        {trainerList.map(t => {
          const tid = t.id as number;
          const studentCount  = (t.student_count  as number) || 0;
          const paidCount     = (t.paid_count      as number) || 0;
          const newCount      = (t.new_count       as number) || 0;
          const archivedCount = (t.archived_count  as number) || 0;
          const isBdayToday   = t.birthdate && (t.birthdate as string).slice(5) === todayMD;

          return (
            <div key={tid}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              style={isBdayToday ? { background: "linear-gradient(135deg,#fffbeb 0%,#fff 70%)" } : undefined}>

              {/* Шапка карточки */}
              <div className="p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-oswald font-bold text-sm flex-shrink-0"
                  style={{ background: "hsl(0,72%,96%)", color: "hsl(0,72%,40%)" }}>
                  {isBdayToday ? "🎂" : ini(t.full_name as string)}
                </div>

                <div className="flex-1 min-w-0">
                  {editId === tid ? (
                    <form onSubmit={saveEdit} className="flex flex-col gap-2">
                      <input className={inputCls} placeholder="ФИО *" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} required />
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputCls} placeholder="Зал" value={editForm.hall} onChange={e => setEditForm(p => ({ ...p, hall: e.target.value }))} />
                        <input className={inputCls} placeholder="Расписание" value={editForm.schedule} onChange={e => setEditForm(p => ({ ...p, schedule: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] text-gray-400 mb-1">Занятий в месяц</div>
                          <input type="number" min={1} max={31} className={inputCls} value={editForm.trainings_per_month} onChange={e => setEditForm(p => ({ ...p, trainings_per_month: +e.target.value }))} />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-1">Дата рождения</div>
                          <input type="date" className={inputCls} value={editForm.birthdate} onChange={e => setEditForm(p => ({ ...p, birthdate: e.target.value }))} />
                        </div>
                      </div>
                      <input className={inputCls} type="password" placeholder="Новый пароль (необязательно)" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
                      {editErr && <div className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{editErr}</div>}
                      <div className="flex gap-2">
                        <OutlineBtn onClick={() => setEditId(null)}>Отмена</OutlineBtn>
                        <PrimaryBtn type="submit" disabled={editSaving}>{editSaving ? "..." : "Сохранить"}</PrimaryBtn>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="font-bold text-[13px] text-gray-900 flex items-center gap-1.5">
                        {t.full_name as string}
                        {isBdayToday && <span className="text-xs">🎉</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        @{t.username as string}{t.hall ? ` · ${t.hall}` : ""}
                      </div>
                      {t.schedule && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Icon name="Clock" size={10} />{t.schedule as string}
                        </div>
                      )}
                      {t.birthdate && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Icon name="Cake" size={10} />
                          {new Date((t.birthdate as string) + "T00:00:00").toLocaleDateString("ru", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                      )}

                      {/* Статистика учеников */}
                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                          <div className="text-sm font-oswald font-bold text-gray-700">{studentCount}</div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">Всего</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-1.5 text-center">
                          <div className="text-sm font-oswald font-bold text-green-600">{paidCount}</div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">Оплатили</div>
                        </div>
                        <div className="rounded-lg p-1.5 text-center" style={{ background: "hsl(265,60%,96%)" }}>
                          <div className="text-sm font-oswald font-bold" style={{ color: "hsl(265,60%,50%)" }}>{newCount}</div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">Новые</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-1.5 text-center">
                          <div className="text-sm font-oswald font-bold text-orange-500">{archivedCount}</div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">Выбыли</div>
                        </div>
                      </div>

                      {/* Прогресс оплат */}
                      {studentCount > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Оплаты этого месяца</span>
                            <span className="font-bold">{paidCount}/{studentCount}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.round(paidCount / studentCount * 100)}%`, background: "hsl(142,55%,42%)" }} />
                          </div>
                        </div>
                      )}

                      {/* Переключатель прав */}
                      <button onClick={() => togglePerm(tid)} disabled={toggling.has(tid)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-all disabled:opacity-50"
                        style={{
                          background: t.can_edit_journal ? "hsl(142,60%,93%)" : "hsl(0,0%,93%)",
                          color: t.can_edit_journal ? "hsl(142,60%,30%)" : "hsl(0,0%,45%)"
                        }}>
                        <Icon name={t.can_edit_journal ? "ShieldCheck" : "ShieldOff"} size={12} />
                        {t.can_edit_journal ? "Может вносить данные" : "Только просмотр"}
                      </button>
                    </>
                  )}
                </div>

                {editId !== tid && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => { setEditId(tid); setEditForm(emptyEdit(t)); setEditErr(""); }}
                      className="text-gray-300 hover:text-blue-400 transition-colors p-1">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => del(tid, t.full_name as string)} disabled={deleting.has(tid)}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 p-1">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {trainerList.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Icon name="Users" size={40} className="mx-auto mb-2 opacity-20" />
            <p>{(trainers as []).length === 0 ? "Нет тренеров" : "Ничего не найдено"}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 mt-1">
        <SupervisorsSection />
      </div>
    </div>
  );
}