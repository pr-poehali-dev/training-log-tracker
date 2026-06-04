import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, attendanceApi, paymentsApi, authApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";
import { type FormState, StudentForm } from "./StudentFormComponent";
import { ArchivedList } from "./ArchivedListComponent";
import { StudentCard } from "./StudentCard";

const todayMMDD = () => new Date().toISOString().slice(5, 10); // MM-DD

const emptyForm = (user: AppUser): FormState => ({
  name: "", hall: user.hall || "", hall2: "", grp: "", schedule: user.schedule || "",
  phone: "", iko: "", fee: 5000, annual_fee_number: "", lvl: "",
  cert: false, cert_from: "", cert_to: "",
  birthdate: "", insurance: false, insurance_to: "",
  has_sport: false, sport_schedule: "",
  team_level: "regular",
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
  const [form, setForm] = useState<FormState>(emptyForm(user));
  const [editForm, setEditForm] = useState<FormState>(emptyForm(user));
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
  const [filterSport, setFilterSport] = useState<"" | "sport" | "main">("");

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

  const hasSportStudents = (students as Record<string, unknown>[]).some(s => s.has_sport);

  const filtered = (students as Record<string, unknown>[]).filter(s => {
    const q = search.toLowerCase();
    if (q && !(s.name as string)?.toLowerCase().includes(q)) return false;
    if (filterGrp && s.grp !== filterGrp) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    if (filterSport === "sport" && !s.has_sport) return false;
    if (filterSport === "main" && s.has_sport) return false;
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
      team_level: ((s.team_level as string) || "regular") as FormState["team_level"],
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

  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0) + (filterSport ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      {offlineToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none">
          {offlineToast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="section-title">
          УЧЕНИКИ <span className="text-gray-400 font-golos font-normal text-sm">({filtered.length})</span>
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowArchive(!showArchive)}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
            <Icon name="Archive" size={13} />Архив
          </button>
          <PrimaryBtn onClick={() => setShowAdd(true)}>
            <Icon name="Plus" size={15} className="inline mr-1" />Добавить
          </PrimaryBtn>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition"
          placeholder="Поиск по имени ученика..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {/* Фильтр по залам */}
      {halls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Зал</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterHall("")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterHall
                ? { background: "hsl(0,72%,40%)", color: "#fff" }
                : { background: "#eee", color: "#555" }}>Все</button>
            {halls.map(h => (
              <button key={h} onClick={() => setFilterHall(filterHall === h ? "" : h)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterHall === h
                  ? { background: "hsl(0,72%,40%)", color: "#fff" }
                  : { background: "#eee", color: "#555" }}>{h}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по группам */}
      {grps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Группа</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGrp("")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterGrp
                ? { background: "hsl(0,72%,40%)", color: "#fff" }
                : { background: "#eee", color: "#555" }}>Все</button>
            {grps.map(g => (
              <button key={g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterGrp === g
                  ? { background: "hsl(0,72%,40%)", color: "#fff" }
                  : { background: "#eee", color: "#555" }}>{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по типу группы */}
      {hasSportStudents && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Тип группы</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterSport("")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === ""
                ? { background: "hsl(0,72%,40%)", color: "#fff" }
                : { background: "#eee", color: "#555" }}>Все</button>
            <button onClick={() => setFilterSport(filterSport === "main" ? "" : "main")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === "main"
                ? { background: "hsl(0,72%,40%)", color: "#fff" }
                : { background: "#eee", color: "#555" }}>🥇 Основная</button>
            <button onClick={() => setFilterSport(filterSport === "sport" ? "" : "sport")}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === "sport"
                ? { background: "hsl(0,72%,40%)", color: "#fff" }
                : { background: "#eee", color: "#555" }}>🏆 Спортивная</button>
          </div>
        </div>
      )}

      {activeFilters > 0 && (
        <button onClick={() => { setFilterGrp(""); setFilterHall(""); setFilterSport(""); }}
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
        return (
          <StudentCard
            key={sid}
            s={s}
            paid={paid}
            isPresentMain={isPresent(sid, "main")}
            isPresentSport={isPresent(sid, "sport")}
            togglingPay={toggling.has(sid)}
            togglingMain={togglingGt.has(`${sid}_main`)}
            togglingSport={togglingGt.has(`${sid}_sport`)}
            canEdit={canEdit}
            certOk={Boolean(isCertOk(s))}
            insOk={Boolean(isInsuranceOk(s))}
            birthday={isBirthday(s)}
            newStudent={isNew(s)}
            onEdit={() => openEdit(s)}
            onArchive={() => { setArchiveStudent(s); setArchiveReason(""); }}
            onMarkPay={() => markPay(sid)}
            onMarkMain={() => markAtt(sid, "main")}
            onMarkSport={() => markAtt(sid, "sport")}
          />
        );
      })}

      {/* Архив — открывается в BottomSheet */}
      <BottomSheet open={showArchive} onClose={() => setShowArchive(false)} title="Архив учеников">
        <ArchivedList user={user} />
      </BottomSheet>

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

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export function PaymentsSection({ user, month }: { user: AppUser; month: string }) {
  const qc = useQueryClient();
  const { data: payData = [], isLoading } = useQuery({ queryKey: ["pay-month", month, user.id], queryFn: () => paymentsApi.byMonth(month) });
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterPaid, setFilterPaid] = useState<"" | "paid" | "unpaid">("");

  const allPayData = payData as Record<string, unknown>[];
  const grps  = [...new Set(allPayData.map(p => p.grp  as string).filter(Boolean))];
  const halls = [...new Set(allPayData.map(p => p.hall as string).filter(Boolean))];

  const filtered = allPayData.filter(p => {
    if (search && !(p.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrp  && p.grp  !== filterGrp)  return false;
    if (filterHall && p.hall !== filterHall)  return false;
    if (filterPaid === "paid"   && !p.paid)   return false;
    if (filterPaid === "unpaid" &&  p.paid)   return false;
    return true;
  });

  const paidCount = filtered.filter(p => p.paid).length;
  const total = filtered.length;
  const revenue = filtered.filter(p => p.paid).reduce((s, p) => s + (p.fee as number || 0), 0);
  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0) + (filterPaid ? 1 : 0);

  const markPay = async (sid: number) => {
    setToggling(prev => new Set([...prev, sid]));
    try { await paymentsApi.mark({ student_id: sid, month, paid: true }); qc.invalidateQueries({ queryKey: ["pay-month"] }); }
    finally { setToggling(prev => { const n = new Set(prev); n.delete(sid); return n; }); }
  };

  if (isLoading) return <Loading />;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">ОПЛАТЫ <span className="text-gray-400 font-golos font-normal text-sm">({total})</span></h1>

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

      {/* Фильтр по залу */}
      {halls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Зал</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterHall("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterHall ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
            {halls.map(h => (
              <button key={h} onClick={() => setFilterHall(filterHall === h ? "" : h)} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterHall === h ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{h}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по группам */}
      {grps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Группа</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGrp("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterGrp ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
            {grps.map(g => (
              <button key={g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterGrp === g ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по статусу */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Статус</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterPaid("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
          <button onClick={() => setFilterPaid(filterPaid === "paid" ? "" : "paid")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "paid" ? { background: "hsl(142,55%,38%)", color: "#fff" } : { background: "#eee", color: "#555" }}>✓ Оплачено</button>
          <button onClick={() => setFilterPaid(filterPaid === "unpaid" ? "" : "unpaid")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "unpaid" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>✗ Не оплачено</button>
        </div>
      </div>

      {/* Сброс фильтров */}
      {(activeFilters > 0 || search) && (
        <button onClick={() => { setFilterGrp(""); setFilterHall(""); setFilterPaid(""); setSearch(""); }}
          className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Icon name="X" size={12} />Сбросить фильтры
        </button>
      )}

      {/* Статы */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold text-gray-700">{total}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Всего</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{paidCount}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Оплатили</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{revenue.toLocaleString("ru")} ₽</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Сбор</div>
        </div>
      </div>

      {/* Прогресс-бар оплат */}
      {total > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Прогресс оплат</span>
            <span className="font-bold">{Math.round(paidCount / total * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(paidCount / total * 100)}%`, background: "hsl(0,72%,40%)" }} />
          </div>
        </div>
      )}

      {/* Список */}
      {filtered.map(p => {
        const sid = p.student_id as number;
        const t = toggling.has(sid);
        return (
          <div key={sid} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
            <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 70, zIndex: 0 }}>
              <img src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
                alt="" className="absolute" style={{ width: 80, height: 80, opacity: 0.04, right: -8, top: "50%", transform: "translateY(-50%)", objectFit: "contain", filter: "grayscale(1)" }} />
            </div>
            <div className="p-3 flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-oswald font-bold flex-shrink-0 ${p.paid ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                {ini(p.name as string)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] text-gray-900">{p.name as string}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {(p.fee as number)?.toLocaleString("ru")} ₽
                  {p.grp ? ` · ${p.grp}` : ""}
                  {p.hall ? ` · ${p.hall}` : ""}
                </div>
              </div>
              {p.paid ? (
                <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>
                  <Icon name="Check" size={12} />Оплачен
                </span>
              ) : (
                <button disabled={t} onClick={() => markPay(sid)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-all active:opacity-80 disabled:opacity-60"
                  style={{ background: "hsl(0,72%,40%)" }}>
                  {t ? "..." : "Оплатить"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="CircleDollarSign" size={40} className="mx-auto mb-2 opacity-30" />
          <p>Нет данных об оплатах</p>
        </div>
      )}
    </div>
  );
}

// ─── ATTENDANCE SECTION ──────────────────────────────────────────────────────
export function AttendanceSection({ user, date, month }: { user: AppUser; date: string; month: string }) {
  const qc = useQueryClient();
  const { data: students = [], isLoading } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: attMonth = [] } = useQuery({ queryKey: ["att-month", month, user.id], queryFn: () => attendanceApi.byMonth(month) });
  const { data: attToday = [] } = useQuery({ queryKey: ["att-date", date, user.id], queryFn: () => attendanceApi.byDate(date) });
  const [editTpm, setEditTpm] = useState(false);
  const [tpm, setTpm] = useState(user.trainings_per_month ?? 13);
  const [savingTpm, setSavingTpm] = useState(false);
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterSport, setFilterSport] = useState<"" | "main" | "sport">("");
  const [search, setSearch] = useState("");

  if (isLoading) return <Loading />;

  const att = attMonth as Record<string, unknown>[];
  const attTodayArr = attToday as Record<string, unknown>[];
  const totalTrainings = user.trainings_per_month ?? 13;
  const allStudents = students as Record<string, unknown>[];

  const grps  = [...new Set(allStudents.map(s => s.grp  as string).filter(Boolean))];
  const halls = [...new Set([
    ...allStudents.map(s => s.hall  as string).filter(Boolean),
    ...allStudents.map(s => s.hall2 as string).filter(Boolean),
  ])];

  const filteredStudents = allStudents.filter(s => {
    if (search && !(s.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrp  && s.grp !== filterGrp) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    if (filterSport === "sport" && !s.has_sport) return false;
    if (filterSport === "main"  &&  s.has_sport) return false;
    return true;
  });

  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0) + (filterSport ? 1 : 0);

  // Итог сегодняшнего дня
  const todayPresentMain  = attTodayArr.filter(a => a.present && (a.group_type ?? "main") === "main").length;
  const todayPresentSport = attTodayArr.filter(a => a.present && a.group_type === "sport").length;
  const todayTotal = filteredStudents.length;

  // Уникальные дни для каждого типа
  const daysMain  = [...new Set(att.filter(a => (a.group_type ?? "main") === "main").map(a => a.date as string))].sort();
  const daysSport = [...new Set(att.filter(a => a.group_type === "sport").map(a => a.date as string))].sort();

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

  const hasSportStudents = allStudents.some(s => s.has_sport);

  // Дата выбранного дня на русском
  const selectedDateRu = new Date(date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="section-title">ПОСЕЩЕНИЯ <span className="text-gray-400 font-golos font-normal text-sm">({filteredStudents.length})</span></h1>

      {/* Итог сегодняшнего дня */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="CalendarDays" size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{selectedDateRu} — итог дня</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 text-center">
            <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{todayPresentMain}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">из {todayTotal} основная</div>
          </div>
          {hasSportStudents && (
            <div className="flex-1 text-center border-l border-gray-100">
              <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(200,70%,42%)" }}>{todayPresentSport}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">спортивная</div>
            </div>
          )}
          <div className="flex-1 text-center border-l border-gray-100">
            <div className="text-2xl font-oswald font-bold text-gray-700">{todayTotal - todayPresentMain}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">отсутствуют</div>
          </div>
        </div>
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

      {/* Фильтр по залу */}
      {halls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Зал</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterHall("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterHall ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
            {halls.map(h => (
              <button key={h} onClick={() => setFilterHall(filterHall === h ? "" : h)} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterHall === h ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{h}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по группе */}
      {grps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Группа</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGrp("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={!filterGrp ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
            {grps.map(g => (
              <button key={g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterGrp === g ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по типу группы */}
      {hasSportStudents && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Тип группы</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterSport("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === "" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
            <button onClick={() => setFilterSport(filterSport === "main" ? "" : "main")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === "main" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>🥇 Основная</button>
            <button onClick={() => setFilterSport(filterSport === "sport" ? "" : "sport")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterSport === "sport" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>🏆 Спортивная</button>
          </div>
        </div>
      )}

      {/* Сброс фильтров */}
      {(activeFilters > 0 || search) && (
        <button onClick={() => { setFilterGrp(""); setFilterHall(""); setFilterSport(""); setSearch(""); }}
          className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Icon name="X" size={12} />Сбросить фильтры ({activeFilters + (search ? 1 : 0)})
        </button>
      )}

      {/* Статы месяца */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{daysMain.length}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Осн. занятий</div>
        </div>
        {hasSportStudents ? (
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(200,70%,42%)" }}>{daysSport.length}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Спорт занятий</div>
          </div>
        ) : <div />}
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          {editTpm ? (
            <div className="flex items-center justify-center gap-1">
              <input type="number" min={1} max={31} value={tpm} onChange={e => setTpm(+e.target.value)}
                className="w-12 bg-gray-50 border border-gray-200 rounded-lg px-1 py-1 text-sm font-bold text-center focus:outline-none focus:border-red-400" />
              <button onClick={saveTpm} disabled={savingTpm} className="text-xs font-bold px-1.5 py-1 rounded-lg text-white" style={{ background: "hsl(0,72%,40%)" }}>{savingTpm ? "..." : "✓"}</button>
              <button onClick={() => setEditTpm(false)} className="text-xs text-gray-400 ml-0.5">✕</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <div className="text-2xl font-oswald font-bold text-gray-700">{totalTrainings}</div>
              <button onClick={() => { setTpm(totalTrainings); setEditTpm(true); }} className="text-gray-300 hover:text-gray-500 mt-0.5">
                <Icon name="Pencil" size={12} />
              </button>
            </div>
          )}
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">План/мес</div>
        </div>
      </div>

      {/* Карточки учеников */}
      {filteredStudents.map(s => {
        const sid = s.id as number;
        const hasSport = Boolean(s.has_sport);
        const cntMain  = countMain(sid);
        const cntSport = hasSport ? countSport(sid) : 0;
        const pct = Math.min(100, totalTrainings ? Math.round(cntMain / totalTrainings * 100) : 0);
        const isGood = pct >= 70;

        return (
          <div key={sid} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
            {/* Водяной знак */}
            <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 70, zIndex: 0 }}>
              <img src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
                alt="" style={{ position: "absolute", width: 80, height: 80, opacity: 0.04, right: -8, top: "50%", transform: "translateY(-50%)", objectFit: "contain", filter: "grayscale(1)" }} />
            </div>

            <div className="p-3 relative z-10">
              {/* Шапка карточки */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-oswald font-bold text-gray-500 flex-shrink-0">
                  {ini(s.name as string)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-gray-900 truncate">{s.name as string}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Осн: {cntMain}/{totalTrainings}
                    {hasSport && <span className="ml-2" style={{ color: "hsl(200,70%,42%)" }}>· Спорт: {cntSport}</span>}
                  </div>
                </div>
                {/* Процент посещаемости */}
                <div className="font-oswald font-bold text-xl flex-shrink-0"
                  style={{ color: isGood ? "hsl(142,55%,38%)" : "hsl(0,72%,40%)" }}>
                  {pct}%
                </div>
              </div>

              {/* Прогресс-бар */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2.5">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: isGood ? "hsl(142,55%,42%)" : "hsl(0,72%,40%)" }} />
              </div>

              {/* Дни основной группы */}
              {daysMain.length > 0 && (
                <div className="mb-2">
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Основная</div>
                  <div className="flex flex-wrap gap-1">
                    {daysMain.map(d => (
                      <span key={d}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold"
                        style={presentOn(sid, d, "main")
                          ? { background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }
                          : { background: "hsl(0,72%,97%)", color: "hsl(0,72%,70%)" }}>
                        {d.slice(5)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Дни спортивной группы */}
              {hasSport && daysSport.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(200,70%,45%)" }}>Спортивная</div>
                  <div className="flex flex-wrap gap-1">
                    {daysSport.map(d => (
                      <span key={d}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold"
                        style={presentOn(sid, d, "sport")
                          ? { background: "hsl(200,55%,93%)", color: "hsl(200,60%,32%)" }
                          : { background: "hsl(200,30%,96%)", color: "hsl(200,40%,70%)" }}>
                        {d.slice(5)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {(students as []).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="CalendarCheck" size={40} className="mx-auto mb-2 opacity-30" />
          <p>Нет данных о посещениях</p>
        </div>
      )}
    </div>
  );
}