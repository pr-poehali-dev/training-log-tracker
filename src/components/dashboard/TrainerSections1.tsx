import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, attendanceApi, paymentsApi, authApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";

const todayMMDD = () => new Date().toISOString().slice(5, 10); // MM-DD

const emptyForm = (user: AppUser) => ({
  name: "", hall: user.hall || "", hall2: "", grp: "", schedule: user.schedule || "",
  phone: "", iko: "", fee: 5000, annual_fee_number: "", lvl: "",
  cert: false, cert_from: "", cert_to: "",
  birthdate: "", insurance: false, insurance_to: "",
  has_sport: false, sport_schedule: "",
});

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export function StudentsSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const qc = useQueryClient();
  const { data: students = [], isLoading, error } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attData = [] } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const { data: payData = [] } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });

  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Record<string, unknown> | null>(null);
  const [archiveStudent, setArchiveStudent] = useState<Record<string, unknown> | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [form, setForm] = useState(emptyForm(user));
  const [editForm, setEditForm] = useState(emptyForm(user));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [togglingGt, setTogglingGt] = useState<Set<string>>(new Set());
  const [offlineToast, setOfflineToast] = useState("");

  const showToast = (msg: string) => {
    setOfflineToast(msg);
    setTimeout(() => setOfflineToast(""), 2500);
  };

  const [search, setSearch] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");

  const today = todayStr();
  const todayMD = todayMMDD();
  const isPresent = (sid: number, groupType: "main" | "sport" = "main") =>
    (attData as Record<string, unknown>[]).some((a: Record<string, unknown>) =>
      a.student_id === sid && a.present && (a.group_type ?? "main") === groupType);
  const isPaid = (sid: number) => (payData as Record<string, unknown>[]).some((p: Record<string, unknown>) => p.student_id === sid && p.paid);
  const isCertOk = (s: Record<string, unknown>) => s.cert && s.cert_to && (s.cert_to as string) >= today;
  const isInsuranceOk = (s: Record<string, unknown>) => s.insurance && s.insurance_to && (s.insurance_to as string) >= today;
  const isBirthday = (s: Record<string, unknown>) => {
    if (!s.birthdate) return false;
    return (s.birthdate as string).slice(5) === todayMD;
  };
  const isNew = (s: Record<string, unknown>) => {
    if (!s.created_at) return false;
    const created = new Date(s.created_at as string);
    const diffDays = (Date.now() - created.getTime()) / 86400000;
    return diffDays <= 30;
  };
  const canEdit = user.role === "admin" || user.can_edit_journal !== false;

  const uniq = (field: string) => [...new Set((students as Record<string, unknown>[]).map(s => s[field] as string).filter(Boolean))];
  const halls = [...new Set([
    ...uniq("hall"),
    ...uniq("hall2"),
  ])].filter(Boolean);
  const grps = uniq("grp");
  const schedules = uniq("schedule");

  const filtered = (students as Record<string, unknown>[]).filter(s => {
    const q = search.toLowerCase();
    if (q && !(s.name as string)?.toLowerCase().includes(q)) return false;
    if (filterGrp && s.grp !== filterGrp) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    return true;
  });

  const markAtt = async (sid: number, groupType: "main" | "sport") => {
    const key = `${sid}_${groupType}`;
    setTogglingGt(prev => new Set([...prev, key]));
    try {
      const res = await attendanceApi.mark({ student_id: sid, date, present: true, group_type: groupType });
      if (res?.offline) {
        showToast("✓ Посещение сохранено (офлайн)");
        qc.setQueryData(["att-date", date, user.id], (old: Record<string, unknown>[] | undefined) => {
          const arr = old || [];
          if (arr.some(a => a.student_id === sid && a.group_type === groupType && a.present)) return arr;
          return [...arr, { student_id: sid, date, present: true, group_type: groupType }];
        });
      } else {
        qc.invalidateQueries({ queryKey: ["att-date"] });
        qc.invalidateQueries({ queryKey: ["att-month"] });
      }
    } finally { setTogglingGt(prev => { const n = new Set(prev); n.delete(key); return n; }); }
  };

  const markPay = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try {
      const res = await paymentsApi.mark({ student_id: sid, month, paid: true });
      if (res?.offline) {
        showToast("✓ Оплата сохранена (офлайн)");
        qc.setQueryData(["pay-month", month, user.id], (old: Record<string, unknown>[] | undefined) => {
          const arr = old || [];
          return arr.map(p => p.student_id === sid ? { ...p, paid: true } : p);
        });
      } else {
        qc.invalidateQueries({ queryKey: ["pay-month"] });
      }
    } finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
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
      hall2: (s.hall2 as string) || "",
      grp: (s.grp as string) || "",
      schedule: (s.schedule as string) || "",
      phone: (s.phone as string) || "",
      iko: (s.iko as string) || "",
      fee: (s.fee as number) ?? 3000,
      annual_fee_number: (s.annual_fee_number as string) || "",
      lvl: (s.lvl as string) || "",
      cert: Boolean(s.cert),
      cert_from: (s.cert_from as string) || "",
      cert_to: (s.cert_to as string) || "",
      birthdate: (s.birthdate as string) || "",
      insurance: Boolean(s.insurance),
      insurance_to: (s.insurance_to as string) || "",
      has_sport: Boolean(s.has_sport),
      sport_schedule: (s.sport_schedule as string) || "",
    });
    setEditStudent(s);
  };

  const confirmArchive = async () => {
    if (!archiveReason.trim()) return;
    setArchiving(true);
    try {
      await studentsApi.remove(archiveStudent!.id as number, archiveReason);
      qc.invalidateQueries({ queryKey: ["students"] });
      setArchiveStudent(null);
      setArchiveReason("");
    } finally { setArchiving(false); }
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      {offlineToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none">
          {offlineToast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="section-title">Ученики <span className="text-gray-400 font-normal text-sm">({filtered.length})</span></h1>
        <div className="flex gap-2">
          <button onClick={() => setShowArchive(!showArchive)}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center gap-1">
            <Icon name="Archive" size={13} />Архив
          </button>
          <PrimaryBtn onClick={() => setShowAdd(true)}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
        </div>
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
            <button onClick={() => setFilterHall("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${!filterHall ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              style={!filterHall ? { background: "hsl(0,72%,40%)" } : {}}>Все</button>
            {halls.map(h => (
              <button key={h} onClick={() => setFilterHall(filterHall === h ? "" : h)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterHall === h ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                style={filterHall === h ? { background: "hsl(0,72%,40%)" } : {}}>{h}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по группам */}
      {grps.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Группа</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterGrp("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${!filterGrp ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              style={!filterGrp ? { background: "hsl(0,72%,40%)" } : {}}>Все</button>
            {grps.map(g => (
              <button key={g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterGrp === g ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                style={filterGrp === g ? { background: "hsl(0,72%,40%)" } : {}}>{g}</button>
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
          <p>{(students as []).length === 0 ? "Нет учеников" : "Ничего не найдено"}</p>
        </div>
      )}

      {filtered.map(s => {
        const sid = s.id as number;
        const paid = isPaid(sid);
        const certOk = isCertOk(s);
        const insOk = isInsuranceOk(s);
        const birthday = isBirthday(s);
        const newStudent = isNew(s);
        const t = toggling.has(sid);

        return (
          <div key={sid} className={`card-glass rounded-2xl overflow-hidden border-l-2 ${birthday ? "border-l-yellow-400" : paid ? "border-l-green-500" : "border-l-red-400"}`}
            style={birthday ? { background: "linear-gradient(135deg, #fffbeb 0%, #fff 60%)" } : undefined}>
            <div className="p-3 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-oswald font-bold flex-shrink-0 ${birthday ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                {birthday ? "🎂" : ini(s.name as string)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-semibold text-sm truncate">{s.name as string}</div>
                  {newStudent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "hsl(265,60%,55%)" }}>NEW</span>}
                  {birthday && <span className="text-[10px]">🎉</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {[s.hall, s.hall2, s.grp, s.lvl].filter(Boolean).join(" · ")}
                </div>
                {s.schedule && <div className="text-xs text-gray-400 flex items-center gap-1"><Icon name="Clock" size={11} />{s.schedule as string}</div>}
                {s.birthdate && <div className="text-xs text-gray-400 flex items-center gap-1"><Icon name="Cake" size={11} />{(s.birthdate as string).split("-").reverse().join(".")}</div>}
                {s.created_at && <div className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5"><Icon name="CalendarPlus" size={10} />с {new Date(s.created_at as string).toLocaleDateString("ru")}</div>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.cert
                    ? (certOk ? <span className="badge-present">✓ Справка</span> : <span className="badge-absent">Справка просрочена</span>)
                    : <span className="badge-absent">Нет справки</span>}
                  {s.insurance
                    ? (insOk ? <span className="badge-present">✓ Страховка</span> : <span className="badge-absent">Страховка просрочена</span>)
                    : null}
                  {s.annual_fee_number && <span className="badge-paid">№ {s.annual_fee_number as string}</span>}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-500 transition-colors">
                  <Icon name="Pencil" size={14} />
                </button>
                <button onClick={() => { setArchiveStudent(s); setArchiveReason(""); }} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Icon name="Archive" size={14} />
                </button>
              </div>
            </div>
            {/* Кнопки действий */}
            <div className="flex border-t border-gray-100">
              {/* Оплата */}
              <div className="flex-1 py-2 text-center">
                {paid
                  ? <span className="text-xs text-green-600 font-semibold">✓ Оплата</span>
                  : canEdit
                    ? <button disabled={t} onClick={() => markPay(sid)} className="text-xs font-semibold" style={{ color: "hsl(28,85%,42%)" }}>{t ? "..." : "💰 Оплатить"}</button>
                    : <span className="text-xs text-gray-300">—</span>}
              </div>
              <div className="w-px bg-gray-100" />
              {/* Основная группа */}
              <div className="flex-1 py-2 text-center">
                {isPresent(sid, "main")
                  ? <span className="text-xs font-semibold" style={{ color: "hsl(142,60%,38%)" }}>✅ Осн.</span>
                  : canEdit
                    ? <button
                        disabled={togglingGt.has(`${sid}_main`)}
                        onClick={() => markAtt(sid, "main")}
                        className="text-xs font-semibold transition-colors"
                        style={{ color: "hsl(0,72%,40%)" }}>
                        {togglingGt.has(`${sid}_main`) ? "..." : "● Осн."}
                      </button>
                    : <span className="text-xs text-gray-300">—</span>}
              </div>
              {/* Спортивная группа — только если has_sport */}
              {s.has_sport && (
                <>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1 py-2 text-center">
                    {isPresent(sid, "sport")
                      ? <span className="text-xs font-semibold" style={{ color: "hsl(200,70%,38%)" }}>✅ Спорт</span>
                      : canEdit
                        ? <button
                            disabled={togglingGt.has(`${sid}_sport`)}
                            onClick={() => markAtt(sid, "sport")}
                            className="text-xs font-semibold transition-colors"
                            style={{ color: "hsl(200,70%,45%)" }}>
                            {togglingGt.has(`${sid}_sport`) ? "..." : "● Спорт"}
                          </button>
                        : <span className="text-xs text-gray-300">—</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Архив */}
      {showArchive && <ArchivedList user={user} />}

      {/* Диалог архивирования */}
      <BottomSheet open={!!archiveStudent} onClose={() => setArchiveStudent(null)} title={`Архивировать: ${archiveStudent?.name}`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Ученик будет перемещён в архив. Укажите причину:</p>
          <textarea
            className={`${inputCls} resize-none`} rows={3}
            placeholder="Причина (например: закончил занятия, переехал...)"
            value={archiveReason} onChange={e => setArchiveReason(e.target.value)} />
          <div className="flex gap-2">
            <OutlineBtn onClick={() => setArchiveStudent(null)}>Отмена</OutlineBtn>
            <PrimaryBtn onClick={confirmArchive} disabled={archiving || !archiveReason.trim()}>
              {archiving ? "..." : "В архив"}
            </PrimaryBtn>
          </div>
        </div>
      </BottomSheet>

      {/* Добавить ученика */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Новый ученик">
        <datalist id="dl-halls">{halls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-grps">{grps.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-schedules">{schedules.map(v => <option key={v} value={v} />)}</datalist>
        <StudentForm form={form} setForm={setForm} onSubmit={addStudent} onCancel={() => setShowAdd(false)} saving={saving} submitLabel="Сохранить" />
      </BottomSheet>

      {/* Редактировать ученика */}
      <BottomSheet open={!!editStudent} onClose={() => setEditStudent(null)} title="Редактировать ученика">
        <datalist id="dl-halls-e">{halls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-grps-e">{grps.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="dl-schedules-e">{schedules.map(v => <option key={v} value={v} />)}</datalist>
        <StudentForm form={editForm} setForm={setEditForm} onSubmit={saveEdit} onCancel={() => setEditStudent(null)} saving={saving} submitLabel="Сохранить изменения" listSuffix="-e" />
      </BottomSheet>
    </div>
  );
}

// ─── ARCHIVED LIST ────────────────────────────────────────────────────────────
function ArchivedList({ user }: { user: AppUser }) {
  const { data: archived = [], isLoading } = useQuery({
    queryKey: ["students-archived", user.id],
    queryFn: () => studentsApi.listArchived(),
  });
  if (isLoading) return <Loading />;
  if ((archived as []).length === 0) return (
    <div className="text-center py-6 text-gray-400 text-sm">Архив пуст</div>
  );
  return (
    <div className="card-glass rounded-2xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
          <Icon name="Archive" size={12} />Архив ({(archived as []).length})
        </div>
      </div>
      {(archived as Record<string, unknown>[]).map(s => (
        <div key={s.id as number} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-500">{s.name as string}</div>
              <div className="text-xs text-gray-400">{[s.hall, s.grp].filter(Boolean).join(" · ")}</div>
              {s.archive_reason && <div className="text-xs text-red-400 mt-0.5">Причина: {s.archive_reason as string}</div>}
            </div>
            <div className="text-[10px] text-gray-300 whitespace-nowrap">
              {s.archived_at ? new Date(s.archived_at as string).toLocaleDateString("ru") : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FORM ────────────────────────────────────────────────────────────────────
type FormState = {
  name: string; hall: string; hall2: string; grp: string; schedule: string;
  phone: string; iko: string; fee: number; annual_fee_number: string; lvl: string;
  cert: boolean; cert_from: string; cert_to: string;
  birthdate: string; insurance: boolean; insurance_to: string;
  has_sport: boolean; sport_schedule: string;
};

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function StudentForm({ form, setForm, onSubmit, onCancel, saving, submitLabel, listSuffix = "" }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  listSuffix?: string;
}) {
  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement).type === "number" ? +(e.target as HTMLInputElement).value : e.target.value }));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input className={inputCls} placeholder="Имя *" value={form.name} onChange={f("name")} required />

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Залы</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Зал 1" list={`dl-halls${listSuffix}`} value={form.hall} onChange={f("hall")} />
        <input className={inputCls} placeholder="Зал 2 (если есть)" list={`dl-halls${listSuffix}`} value={form.hall2} onChange={f("hall2")} />
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Группа и контакт</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Группа" list={`dl-grps${listSuffix}`} value={form.grp} onChange={f("grp")} />
        <input className={inputCls} placeholder="Время группы" list={`dl-schedules${listSuffix}`} value={form.schedule} onChange={f("schedule")} />
        <input className={inputCls} placeholder="Телефон" value={form.phone} onChange={f("phone")} />
        <input className={inputCls} placeholder="IKO карта" value={form.iko} onChange={f("iko")} />
        <input className={inputCls} placeholder="Уровень / пояс" value={form.lvl} onChange={f("lvl")} />
        <input className={inputCls} placeholder="Дата рождения" type="date" value={form.birthdate} onChange={f("birthdate")} />
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Оплата</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Абонемент ₽" type="number" value={form.fee} onChange={f("fee")} />
        <input className={inputCls} placeholder="№ годового взноса" value={form.annual_fee_number} onChange={f("annual_fee_number")} />
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Медицинская справка</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.cert} onChange={f("cert")} className="accent-red-600 w-4 h-4" />
        Есть медицинская справка
      </label>
      {form.cert && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Дата выдачи</div>
              <input className={inputCls} type="date" value={form.cert_from} onChange={f("cert_from")} />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Дата окончания</div>
              <input className={inputCls} type="date" value={form.cert_to} onChange={f("cert_to")} />
            </div>
          </div>
          {form.cert_from && (
            <div className="flex gap-2">
              <button type="button"
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => setForm(p => ({ ...p, cert_to: addMonths(p.cert_from, 6) }))}>
                + 6 месяцев
              </button>
              <button type="button"
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => setForm(p => ({ ...p, cert_to: addMonths(p.cert_from, 12) }))}>
                + 1 год
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Страховка</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.insurance} onChange={f("insurance")} className="accent-red-600 w-4 h-4" />
        Есть страховка
      </label>
      {form.insurance && (
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Страховка действует до</div>
            <input className={inputCls} type="date" value={form.insurance_to} onChange={f("insurance_to")} />
          </div>
        </div>
      )}

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Спортивная группа</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.has_sport} onChange={f("has_sport")} className="accent-blue-600 w-4 h-4" />
        Ходит в спортивную группу
      </label>
      {form.has_sport && (
        <div>
          <div className="text-[10px] text-gray-400 mb-1">Расписание спортивной группы</div>
          <input className={inputCls} placeholder="Например: вт/чт 19:00" value={form.sport_schedule} onChange={f("sport_schedule")} />
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
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-gray-700">{total}</div><div className="text-xs text-gray-400 mt-1">Всего</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold text-green-600">{paidCount}</div><div className="text-xs text-gray-400 mt-1">Оплатили</div></div>
        <div className="stat-card text-center"><div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{revenue.toLocaleString("ru")} ₽</div><div className="text-xs text-gray-400 mt-1">Сбор</div></div>
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
  const qc = useQueryClient();
  const { data: students = [], isLoading } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attMonth = [] } = useQuery({ queryKey: ["att-month", month, user.id], queryFn: () => attendanceApi.byMonth(month) });
  const [editTpm, setEditTpm] = useState(false);
  const [tpm, setTpm] = useState(user.trainings_per_month ?? 13);
  const [savingTpm, setSavingTpm] = useState(false);

  if (isLoading) return <Loading />;

  const att = attMonth as Record<string, unknown>[];
  const totalTrainings = user.trainings_per_month ?? 13;

  // Уникальные дни для каждого типа
  const daysMain  = [...new Set(att.filter(a => (a.group_type ?? "main") === "main").map(a => a.date as string))].sort();
  const daysSport = [...new Set(att.filter(a => a.group_type === "sport").map(a => a.date as string))].sort();
  const allDays   = [...new Set([...daysMain, ...daysSport])].sort();

  const presentOn = (sid: number, d: string, gt: "main" | "sport") =>
    att.some(a => a.student_id === sid && a.date === d && a.present && (a.group_type ?? "main") === gt);

  const countMain  = (sid: number) => daysMain.filter(d => presentOn(sid, d, "main")).length;
  const countSport = (sid: number) => daysSport.filter(d => presentOn(sid, d, "sport")).length;

  const saveTpm = async () => {
    setSavingTpm(true);
    try {
      await authApi.updateTrainer(user.id, { full_name: user.full_name, hall: user.hall, schedule: user.schedule, trainings_per_month: tpm });
      const updated = { ...user, trainings_per_month: tpm };
      localStorage.setItem("iko_user", JSON.stringify(updated));
      qc.invalidateQueries({ queryKey: ["att-month"] });
      setEditTpm(false);
    } finally { setSavingTpm(false); }
  };

  const hasSportStudents = (students as Record<string, unknown>[]).some(s => s.has_sport);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">Посещения — {month}</h1>

      {/* Итоговые счётчики */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card text-center">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{daysMain.length}</div>
          <div className="text-xs text-gray-400">Осн. занятий</div>
        </div>
        {hasSportStudents && (
          <div className="stat-card text-center">
            <div className="text-xl font-oswald font-bold" style={{ color: "hsl(200,70%,42%)" }}>{daysSport.length}</div>
            <div className="text-xs text-gray-400">Спорт занятий</div>
          </div>
        )}
        <div className="stat-card text-center flex-1">
          <div className="flex-1">
            {editTpm ? (
              <div className="flex items-center justify-center gap-1">
                <input type="number" min={1} max={31} value={tpm} onChange={e => setTpm(+e.target.value)}
                  className="w-12 bg-gray-50 border border-gray-200 rounded px-1 py-1 text-sm font-bold text-center focus:outline-none focus:border-red-400" />
                <button onClick={saveTpm} disabled={savingTpm} className="text-xs font-bold px-1.5 py-1 rounded text-white" style={{ background: "hsl(0,72%,40%)" }}>{savingTpm ? "..." : "✓"}</button>
                <button onClick={() => setEditTpm(false)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <div className="text-xl font-oswald font-bold text-gray-700">{totalTrainings}</div>
                <button onClick={() => { setTpm(totalTrainings); setEditTpm(true); }} className="text-gray-300 hover:text-gray-500"><Icon name="Pencil" size={12} /></button>
              </div>
            )}
            <div className="text-xs text-gray-400">План/мес</div>
          </div>
        </div>
      </div>

      {/* Карточки учеников */}
      {(students as Record<string, unknown>[]).map(s => {
        const sid = s.id as number;
        const hasSport = Boolean(s.has_sport);
        const cntMain  = countMain(sid);
        const cntSport = hasSport ? countSport(sid) : 0;
        const cntTotal = cntMain + cntSport;
        const pct = Math.min(100, totalTrainings ? Math.round(cntMain / totalTrainings * 100) : 0);

        return (
          <div key={sid} className="card-glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-oswald font-bold text-gray-500">{ini(s.name as string)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{s.name as string}</div>
                <div className="text-xs text-gray-400">
                  Осн: {cntMain}/{totalTrainings} ({pct}%)
                  {hasSport && <span className="ml-2" style={{ color: "hsl(200,70%,42%)" }}>· Спорт: {cntSport}</span>}
                  {hasSport && <span className="text-gray-300 ml-1">· Всего: {cntTotal}</span>}
                </div>
              </div>
              <div className="text-lg font-oswald font-bold" style={{ color: pct >= 70 ? "hsl(142,60%,40%)" : "hsl(0,72%,40%)" }}>{pct}%</div>
            </div>

            {/* Дни основной группы */}
            {daysMain.length > 0 && (
              <div className="mb-1.5">
                <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Основная</div>
                <div className="flex flex-wrap gap-1">
                  {daysMain.map(d => (
                    <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${presentOn(sid, d, "main") ? "bg-green-100 text-green-700" : "bg-red-50 text-red-300"}`}>
                      {d.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Дни спортивной группы — только для тех у кого has_sport */}
            {hasSport && daysSport.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-wide mb-1" style={{ color: "hsl(200,70%,45%)" }}>Спортивная</div>
                <div className="flex flex-wrap gap-1">
                  {daysSport.map(d => (
                    <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${presentOn(sid, d, "sport") ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-300"}`}>
                      {d.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}