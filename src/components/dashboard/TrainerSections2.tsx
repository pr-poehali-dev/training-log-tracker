import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi, personalApi, notesApi, reportsApi, expensesApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

import { PrimaryBtn, OutlineBtn, Loading, ErrBlock, BottomSheet, todayStr, ini, inputCls } from "./trainer-ui";
import PushToggle from "@/components/shared/PushToggle";

// Типы доп. тренировок
const SESSION_TYPES = [
  { value: "kata",     label: "Ката класс" },
  { value: "group",    label: "Групповая тренировка" },
  { value: "strength", label: "Силовая тренировка" },
  { value: "personal", label: "Персональная тренировка" },
];
const sessionTypeLabel = (v: string) => SESSION_TYPES.find(t => t.value === v)?.label || "Персональная тренировка";

// ─── ДОП. ТРЕНИРОВКИ ──────────────────────────────────────────────────────────
export function PersonalSection({ user, month }: { user: AppUser; month: string }) {
  const qc = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students", user.id], queryFn: () => studentsApi.list() });
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ["personal", month, user.id], queryFn: () => personalApi.byMonth(month) });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ student_name: "", date: todayStr(), duration: 60, cost: 1500, paid: false, note: "", session_type: "personal" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterPaid, setFilterPaid] = useState<"" | "paid" | "unpaid">("");
  const [filterType, setFilterType] = useState("");

  const allSessions = sessions as Record<string, unknown>[];
  const allStudentsData = students as Record<string, unknown>[];

  const filteredSessions = allSessions.filter(p => {
    if (search && !(p.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPaid === "paid"   && !p.paid) return false;
    if (filterPaid === "unpaid" &&  p.paid) return false;
    if (filterType && (p.session_type || "personal") !== filterType) return false;
    return true;
  });

  const totalRev = filteredSessions.filter(p => p.paid).reduce((s, p) => s + (p.cost as number), 0);

  const openAdd = () => { setEditId(null); setFormErr(""); setForm({ student_name: "", date: todayStr(), duration: 60, cost: 1500, paid: false, note: "", session_type: "personal" }); setShowForm(true); };
  const openEdit = (p: Record<string, unknown>) => { setEditId(p.id as number); setFormErr(""); setForm({ student_name: (p.name as string) || "", date: p.date as string, duration: p.duration as number, cost: p.cost as number, paid: p.paid as boolean, note: p.note as string || "", session_type: (p.session_type as string) || "personal" }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.student_name.trim();
    const match = allStudentsData.find(s => (s.name as string)?.toLowerCase() === name.toLowerCase());
    if (!match) { setFormErr("Ученик с таким именем не найден. Проверьте написание — оно должно совпадать с карточкой ученика."); return; }
    setFormErr("");
    setSaving(true);
    try {
      const payload = { ...form, student_id: match.id as number };
      if (editId) { await personalApi.update(editId, payload); }
      else { await personalApi.create(payload); }
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
        <h1 className="section-title">ДОП. ТРЕНИРОВКИ <span className="text-gray-400 font-golos font-normal text-sm">({filteredSessions.length})</span></h1>
        <PrimaryBtn onClick={openAdd}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
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

      {/* Фильтр по типу тренировки */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Тип</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterType("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterType === "" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
          {SESSION_TYPES.map(t => (
            <button key={t.value} onClick={() => setFilterType(filterType === t.value ? "" : t.value)} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filterType === t.value ? { background: "hsl(262,52%,47%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{t.label}</button>
          ))}
        </div>
      </div>

      {(search || filterPaid || filterType) && (
        <button onClick={() => { setSearch(""); setFilterPaid(""); setFilterType(""); }}
          className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Icon name="X" size={12} />Сбросить фильтры
        </button>
      )}

      {/* Статы */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{filteredSessions.length}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Тренировок</div>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{totalRev.toLocaleString()} ₽</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Выручка</div>
        </div>
      </div>

      {/* Список тренировок */}
      {filteredSessions.map(p => (
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
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><Icon name="CalendarDays" size={10} />{(p.date as string).slice(5)}</span>
                <span className="flex items-center gap-1"><Icon name="Clock" size={10} />{p.duration as number} мин</span>
              </div>
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(262,52%,95%)", color: "hsl(262,52%,42%)" }}>
                {sessionTypeLabel((p.session_type as string) || "personal")}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-oswald font-bold text-sm" style={{ color: "hsl(142,55%,38%)" }}>{(p.cost as number).toLocaleString()} ₽</span>
              {p.paid
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>✓ Оплачено</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,50%)" }}>Не оплачено</span>}
            </div>
          </div>
          {user.role === "admin" && (
            <div className="flex border-t border-gray-100 relative z-10">
              <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
                <Icon name="Pencil" size={12} />Изменить
              </button>
              <button onClick={() => del(p.id as number)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold hover:bg-red-50 transition-colors" style={{ color: "hsl(0,72%,50%)" }}>
                <Icon name="Trash2" size={12} />Удалить
              </button>
            </div>
          )}
        </div>
      ))}

      {filteredSessions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="Dumbbell" size={40} className="mx-auto mb-2 opacity-20" />
          <p>{allSessions.length === 0 ? "Нет дополнительных тренировок" : "Ничего не найдено"}</p>
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editId ? "Редактировать" : "Новая тренировка"}>
        <datalist id="dl-personal-students">
          {allStudentsData.map(s => <option key={s.id as number} value={s.name as string} />)}
        </datalist>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input
            className={inputCls}
            list="dl-personal-students"
            placeholder="Имя ученика"
            value={form.student_name}
            onChange={e => { setForm(p => ({ ...p, student_name: e.target.value })); setFormErr(""); }}
            autoComplete="off"
          />
          {formErr && <div className="text-xs text-red-500 -mt-2">{formErr}</div>}
          <div>
            <div className="text-[11px] text-gray-400 font-semibold mb-1">Тип тренировки</div>
            <select className={inputCls} value={form.session_type} onChange={e => setForm(p => ({ ...p, session_type: e.target.value }))}>
              {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
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
  const [search, setSearch] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterPaid, setFilterPaid] = useState<"" | "paid" | "unpaid">("");

  if (isLoading) return <Loading />;
  if (error) return <ErrBlock msg="Ошибка загрузки" />;

  const summary = data?.summary || {};
  const allStudents: Record<string, unknown>[] = data?.students || [];

  const grps  = [...new Set(allStudents.map(s => s.grp  as string).filter(Boolean))];
  const halls = [...new Set(allStudents.map(s => s.hall as string).filter(Boolean))];

  const students = allStudents.filter(s => {
    if (search && !(s.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrp  && s.grp  !== filterGrp)  return false;
    if (filterHall && s.hall !== filterHall)  return false;
    if (filterPaid === "paid"   && !s.paid)   return false;
    if (filterPaid === "unpaid" &&  s.paid)   return false;
    return true;
  });

  const activeFilters = (filterGrp ? 1 : 0) + (filterHall ? 1 : 0) + (filterPaid ? 1 : 0);

  const exportCsv = () => {
    const headers = ["Ученик", "Зал", "Группа", "Был/Всего", "Перс.", "%", "Оплата"];
    const rows = students.map(s => [s.name, s.hall, s.grp, `${s.present_count}/${s.total_days}`, s.personal_count, s.attendance_rate + "%", s.paid ? "Оплачен" : "Не оплачен"]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = `отчёт_${month}.csv`; a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="section-title">ОТЧЁТЫ <span className="text-gray-400 font-golos font-normal text-sm">({students.length})</span></h1>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
          <Icon name="Download" size={13} />CSV
        </button>
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

      {/* Фильтр по статусу */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Статус</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterPaid("")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>Все</button>
          <button onClick={() => setFilterPaid(filterPaid === "paid" ? "" : "paid")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "paid" ? { background: "hsl(142,55%,38%)", color: "#fff" } : { background: "#eee", color: "#555" }}>✓ Оплатили</button>
          <button onClick={() => setFilterPaid(filterPaid === "unpaid" ? "" : "unpaid")} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={filterPaid === "unpaid" ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>✗ Должники</button>
        </div>
      </div>

      {(activeFilters > 0 || search) && (
        <button onClick={() => { setFilterGrp(""); setFilterHall(""); setFilterPaid(""); setSearch(""); }}
          className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Icon name="X" size={12} />Сбросить фильтры
        </button>
      )}

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
          <p>{allStudents.length === 0 ? "Нет данных за этот месяц" : "Ничего не найдено"}</p>
        </div>
      )}
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
export function ExpensesSection({ user, month }: { user: AppUser; month: string }) {
  const qc = useQueryClient();
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", month, user.id],
    queryFn: () => expensesApi.byMonth(month),
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", date: todayStr(), category: "" });

  const list = expenses as Record<string, unknown>[];
  const totalAmount = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // Уникальные категории для быстрого выбора
  const categories = [...new Set(list.map(e => e.category as string).filter(Boolean))];

  const openAdd = () => {
    setEditId(null);
    setForm({ title: "", amount: "", date: todayStr(), category: "" });
    setShowForm(true);
  };

  const openEdit = (e: Record<string, unknown>) => {
    setEditId(e.id as number);
    setForm({
      title: e.title as string,
      amount: String(e.amount),
      date: (e.date as string).slice(0, 10),
      category: (e.category as string) || "",
    });
    setShowForm(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.title.trim() || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), amount: parseFloat(form.amount), date: form.date, category: form.category.trim() };
      if (editId) await expensesApi.update(editId, payload);
      else await expensesApi.create(payload);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!window.confirm("Удалить расход?")) return;
    await expensesApi.remove(id);
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  if (isLoading) return <Loading />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="section-title">РАСХОДЫ <span className="text-gray-400 font-golos font-normal text-sm">({list.length})</span></h1>
        <PrimaryBtn onClick={openAdd}><Icon name="Plus" size={15} className="inline mr-1" />Добавить</PrimaryBtn>
      </div>

      {/* Итого */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(0,72%,96%)" }}>
          <Icon name="Receipt" size={18} style={{ color: "hsl(0,72%,40%)" }} />
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Итого за месяц</div>
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>
            {totalAmount.toLocaleString("ru")} ₽
          </div>
        </div>
      </div>

      {/* Список расходов */}
      {list.map(e => (
        <div key={e.id as number} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="p-3 flex items-start gap-3">
            {/* Дата */}
            <div className="flex-shrink-0 text-center pt-0.5">
              <div className="text-xs font-bold text-gray-900 font-mono">
                {(e.date as string).slice(8, 10)}
              </div>
              <div className="text-[10px] text-gray-400 uppercase">
                {new Date((e.date as string).slice(0, 10) + "T00:00:00").toLocaleDateString("ru-RU", { month: "short" })}
              </div>
            </div>
            <div className="w-px self-stretch bg-gray-100 flex-shrink-0 mx-1" />
            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] text-gray-900">{e.title as string}</div>
              {e.category && (
                <div className="mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {e.category as string}
                  </span>
                </div>
              )}
            </div>
            {/* Сумма */}
            <div className="flex-shrink-0 text-right">
              <div className="font-oswald font-bold text-base" style={{ color: "hsl(0,72%,40%)" }}>
                {Number(e.amount).toLocaleString("ru")} ₽
              </div>
            </div>
          </div>
          <div className="flex border-t border-gray-100">
            <button onClick={() => openEdit(e)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
              <Icon name="Pencil" size={12} />Изменить
            </button>
            <button onClick={() => del(e.id as number)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold hover:bg-red-50 transition-colors"
              style={{ color: "hsl(0,72%,50%)" }}>
              <Icon name="Trash2" size={12} />Удалить
            </button>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="Receipt" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Нет расходов за этот месяц</p>
        </div>
      )}

      {/* Форма добавления / редактирования */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title={editId ? "Редактировать расход" : "Новый расход"}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <input
            className={inputCls}
            placeholder="Название расхода *"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              type="number"
              placeholder="Сумма ₽ *"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              required
            />
            <input
              className={inputCls}
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <input
            className={inputCls}
            placeholder="Статья расходов (напр. хозтовары)"
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            list="dl-categories"
          />
          {categories.length > 0 && (
            <datalist id="dl-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          )}
          <div className="flex gap-2 pt-1">
            <OutlineBtn onClick={() => setShowForm(false)}>Отмена</OutlineBtn>
            <PrimaryBtn type="submit" disabled={saving}>{saving ? "..." : "Сохранить"}</PrimaryBtn>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}