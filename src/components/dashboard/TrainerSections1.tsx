import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, attendanceApi, paymentsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";

const emptyForm = (user: AppUser) => ({
  name: "", hall: user.hall || "", grp: "", schedule: user.schedule || "",
  phone: "", iko: "", fee: 5000, lvl: "", cert: false, cert_from: "", cert_to: "",
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export function StudentsSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const qc = useQueryClient();
  const { data: students = [], isLoading, error } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attData = [] } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });

  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(emptyForm(user));
  const [editForm, setEditForm] = useState(emptyForm(user));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");

  const today = todayStr();
  const isPresent = (sid: number) => attData.some((a: Record<string, unknown>) => a.student_id === sid && a.present);
  const isPaid = (sid: number) => payData.some((p: Record<string, unknown>) => p.student_id === sid && p.paid);
  const isCertOk = (s: Record<string, unknown>) => s.cert && s.cert_to && (s.cert_to as string) >= today;
  const canEdit = user.role === "admin" || user.can_edit_journal !== false;

  const uniq = (field: string) => [...new Set((students as Record<string, unknown>[]).map(s => s[field] as string).filter(Boolean))];
  const halls = uniq("hall");
  const grps = uniq("grp");
  const schedules = uniq("schedule");

  const filtered = (students as Record<string, unknown>[]).filter(s => {
    const q = search.toLowerCase();
    if (q && !(s.name as string)?.toLowerCase().includes(q)) return false;
    if (filterGrp && s.grp !== filterGrp) return false;
    if (filterHall && s.hall !== filterHall) return false;
    return true;
  });

  const markAtt = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await attendanceApi.mark({ student_id: sid, date, present: true }); qc.invalidateQueries({ queryKey: ["att-date"] }); qc.invalidateQueries({ queryKey: ["att-month"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };
  const markPay = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await paymentsApi.mark({ student_id: sid, month, paid: true }); qc.invalidateQueries({ queryKey: ["pay-month"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };
  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await studentsApi.create(form);
      qc.invalidateQueries({ queryKey: ["students"] });
      setShowAdd(false);
      setForm(emptyForm(user));
    } finally { setSaving(false); }
  };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await studentsApi.update(editStudent!.id as number, editForm);
      qc.invalidateQueries({ queryKey: ["students"] });
      setEditStudent(null);
    } finally { setSaving(false); }
  };
  const openEdit = (s: Record<string, unknown>) => {
    setEditForm({
      name: (s.name as string) || "",
      hall: (s.hall as string) || "",
      grp: (s.grp as string) || "",
      schedule: (s.schedule as string) || "",
      phone: (s.phone as string) || "",
      iko: (s.iko as string) || "",
      fee: (s.fee as number) ?? 3000,
      lvl: (s.lvl as string) || "",
      cert: Boolean(s.cert),
      cert_from: (s.cert_from as string) || "",
      cert_to: (s.cert_to as string) || "",
    });
    setEditStudent(s);
  };
  const deleteStudent = async (id: number, name: string) => {
    if (!window.confirm(`Удалить "${name}"?`)) return;
    await studentsApi.remove(id); qc.invalidateQueries({ queryKey: ["students"] });
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Ученики <span className="text-gray-400 font-normal text-sm">({filtered.length})</span></h1>
        <PrimaryBtn onClick={() => setShowAdd(true)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={`${inputCls} pl-8 pr-8`} placeholder="Поиск по имени..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Icon name="X" size={13} /></button>}
      </div>

      {/* Фильтр по залам */}
      {halls.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Зал</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterHall("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${!filterHall ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              style={!filterHall ? { background: "hsl(0,72%,40%)" } : {}}>
              Все
            </button>
            {halls.map(h => (
              <button key={h} onClick={() => setFilterHall(filterHall === h ? "" : h)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterHall === h ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                style={filterHall === h ? { background: "hsl(0,72%,40%)" } : {}}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по группам */}
      {grps.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Группа</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterGrp("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${!filterGrp ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              style={!filterGrp ? { background: "hsl(0,72%,40%)" } : {}}>
              Все
            </button>
            {grps.map(g => (
              <button key={g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterGrp === g ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                style={filterGrp === g ? { background: "hsl(0,72%,40%)" } : {}}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFilters > 0 && (
        <button onClick={() => { setFilterGrp(""); setFilterHall(""); }}
          className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Icon name="X" size={12} />Сбросить фильтры ({activeFilters})
        </button>
      )}

      {!canEdit && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold">
          <Icon name="ShieldOff" size={13} />
          Просмотр — внесение данных заблокировано администратором
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="Users" size={40} className="mx-auto mb-2 opacity-30" />
          <p>{students.length === 0 ? "Нет учеников" : "Ничего не найдено"}</p>
        </div>
      )}

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
                <div className="text-xs text-gray-400 mt-0.5">{[s.hall, s.grp, s.lvl].filter(Boolean).join(" · ")}</div>
                {s.schedule && <div className="text-xs text-gray-400 flex items-center gap-1"><Icon name="Clock" size={11} />{s.schedule as string}</div>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.cert ? (certOk ? <span className="badge-present">✓ Справка</span> : <span className="badge-absent">Просрочена</span>) : <span className="badge-absent">Нет справки</span>}
                  {here ? <span className="badge-present">✅ Был</span> : <span className="badge-absent">❌ Нет</span>}
                  {paid ? <span className="badge-paid">💰 Оплачен</span> : <span className="badge-overdue">✗ Не оплачен</span>}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-500 transition-colors">
                  <Icon name="Pencil" size={14} />
                </button>
                <button onClick={() => deleteStudent(sid, s.name as string)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
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

      {/* Добавить ученика */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Новый ученик">
        <datalist id="dl-halls">{halls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-grps">{grps.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-schedules">{schedules.map(v => <option key={v} value={v} />)}</datalist>
        <StudentForm
          form={form} setForm={setForm}
          onSubmit={addStudent} onCancel={() => setShowAdd(false)}
          saving={saving} submitLabel="Сохранить"
        />
      </BottomSheet>

      {/* Редактировать ученика */}
      <BottomSheet open={!!editStudent} onClose={() => setEditStudent(null)} title="Редактировать ученика">
        <datalist id="dl-halls-e">{halls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-grps-e">{grps.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-schedules-e">{schedules.map(v => <option key={v} value={v} />)}</datalist>
        <StudentForm
          form={editForm} setForm={setEditForm}
          onSubmit={saveEdit} onCancel={() => setEditStudent(null)}
          saving={saving} submitLabel="Сохранить изменения"
          listSuffix="-e"
        />
      </BottomSheet>
    </div>
  );
}

// ─── FORM ────────────────────────────────────────────────────────────────────
type FormState = {
  name: string; hall: string; grp: string; schedule: string;
  phone: string; iko: string; fee: number; lvl: string;
  cert: boolean; cert_from: string; cert_to: string;
};
function StudentForm({ form, setForm, onSubmit, onCancel, saving, submitLabel, listSuffix = "" }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  listSuffix?: string;
}) {
  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.type === "number" ? +e.target.value : e.target.value }));
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input className={inputCls} placeholder="Имя *" value={form.name} onChange={f("name")} required />
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Зал" list={`dl-halls${listSuffix}`} value={form.hall} onChange={f("hall")} />
        <input className={inputCls} placeholder="Группа" list={`dl-grps${listSuffix}`} value={form.grp} onChange={f("grp")} />
        <input className={inputCls} placeholder="Время группы" list={`dl-schedules${listSuffix}`} value={form.schedule} onChange={f("schedule")} />
        <input className={inputCls} placeholder="Телефон" value={form.phone} onChange={f("phone")} />
        <input className={inputCls} placeholder="IKO карта" value={form.iko} onChange={f("iko")} />
        <input className={inputCls} placeholder="Абонемент ₽" type="number" value={form.fee} onChange={f("fee")} />
        <input className={inputCls} placeholder="Уровень" value={form.lvl} onChange={f("lvl")} />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.cert} onChange={f("cert")} className="accent-red-600 w-4 h-4" />
        Медицинская справка
      </label>
      {form.cert && (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} type="date" value={form.cert_from} onChange={f("cert_from")} />
          <input className={inputCls} type="date" value={form.cert_to} onChange={f("cert_to")} />
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <OutlineBtn onClick={onCancel}>Отмена</OutlineBtn>
        <PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : submitLabel}</PrimaryBtn>
      </div>
    </form>
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
      <h1 className="section-title">Оплата — {month}</h1>
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{paidCount}</div><div className="text-[10px] text-gray-400">Оплатили</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-red-500">{total - paidCount}</div><div className="text-[10px] text-gray-400">Не оплатили</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{revenue.toLocaleString("ru")}</div><div className="text-[10px] text-gray-400">₽ собрано</div></div>
      </div>
      {(payData as Record<string, unknown>[]).map(p => {
        const sid = p.student_id as number;
        const t = toggling.has(sid);
        return (
          <div key={sid} className={`card-glass rounded-xl p-3 flex items-center gap-3 border-l-2 ${p.paid ? "border-l-green-500" : "border-l-red-400"}`}>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-oswald font-bold text-gray-500">{ini(p.name as string)}</div>
            <div className="flex-1"><div className="text-sm font-semibold">{p.name as string}</div><div className="text-xs text-gray-400">{(p.fee as number)?.toLocaleString("ru")} ₽</div></div>
            {p.paid
              ? <span className="text-xs text-green-600 font-semibold">✓ Оплачен</span>
              : <button disabled={t} onClick={() => markPay(sid)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "hsl(0,72%,40%)" }}>{t ? "..." : "Оплатить"}</button>}
          </div>
        );
      })}
    </div>
  );
}

// ─── ATTENDANCE SECTION ──────────────────────────────────────────────────────
export function AttendanceSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const { data: students = [], isLoading } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attMonth = [] } = useQuery({ queryKey: ["att-month", month, user.id], queryFn: () => attendanceApi.byMonth(month) });

  if (isLoading) return <Loading />;

  const days = [...new Set((attMonth as Record<string, unknown>[]).map(a => a.date as string))].sort();
  const presentOn = (sid: number, d: string) =>
    (attMonth as Record<string, unknown>[]).some(a => a.student_id === sid && a.date === d && a.present);
  const total = (sid: number) => days.filter(d => presentOn(sid, d)).length;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">Посещения — {month}</h1>
      <div className="stat-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(0,72%,97%)" }}><Icon name="CalendarCheck" size={20} style={{ color: "hsl(0,72%,40%)" }} /></div>
        <div><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{days.length}</div><div className="text-xs text-gray-400">Занятий в этом месяце</div></div>
      </div>
      {(students as Record<string, unknown>[]).map(s => {
        const sid = s.id as number;
        const cnt = total(sid);
        const pct = days.length ? Math.round(cnt / days.length * 100) : 0;
        return (
          <div key={sid} className="card-glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-oswald font-bold text-gray-500">{ini(s.name as string)}</div>
              <div className="flex-1"><div className="text-sm font-semibold">{s.name as string}</div><div className="text-xs text-gray-400">{cnt} из {days.length} занятий · {pct}%</div></div>
              <div className="text-lg font-oswald font-bold" style={{ color: pct >= 70 ? "hsl(142,60%,40%)" : "hsl(0,72%,40%)" }}>{pct}%</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {days.map(d => (
                <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${presentOn(sid, d) ? "bg-green-100 text-green-700" : "bg-red-50 text-red-400"}`}>
                  {d.slice(5)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}