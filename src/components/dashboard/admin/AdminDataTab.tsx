import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, studentsApi, attendanceApi, paymentsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

const todayStr  = () => new Date().toISOString().slice(0, 10);
const monStr    = () => new Date().toISOString().slice(0, 7);
const todayMMDD = () => new Date().toISOString().slice(5, 10);
const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";

function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

export default function AdminDataTab() {
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());
  const [showArchive, setShowArchive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterPaid, setFilterPaid] = useState<"" | "paid" | "unpaid">("");
  const [filterBirthday, setFilterBirthday] = useState(false);
  const [filterSport, setFilterSport] = useState<"" | "main" | "sport">("");
  const qc = useQueryClient();

  const today    = todayStr();
  const todayMD  = todayMMDD();

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
  const { data: attData = [] } = useQuery({
    queryKey: ["att-admin", date, selectedTrainer],
    queryFn: () => attendanceApi.byDate(date, selectedTrainer!),
    enabled,
  });
  const { data: payData = [] } = useQuery({
    queryKey: ["pay-admin", month, selectedTrainer],
    queryFn: () => paymentsApi.byMonth(month, selectedTrainer!),
    enabled,
  });

  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const isPresent = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present);
  const isPaid    = (sid: number) => (payData as Record<string, unknown>[]).some(p => p.student_id === sid && p.paid);
  const isBirthday = (s: Record<string, unknown>) => s.birthdate && (s.birthdate as string).slice(5) === todayMD;
  const isCertOk   = (s: Record<string, unknown>) => s.cert_to && (s.cert_to as string) >= today;
  const isInsOk    = (s: Record<string, unknown>) => s.insurance && s.insurance_to && (s.insurance_to as string) >= today;

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

  const allStudents = students as Record<string, unknown>[];
  const halls   = [...new Set([...allStudents.map(s => s.hall as string), ...allStudents.map(s => s.hall2 as string)].filter(Boolean))];
  const grps    = [...new Set(allStudents.map(s => s.grp as string).filter(Boolean))];
  const hasSport = allStudents.some(s => s.has_sport);

  const filtered = allStudents.filter(s => {
    const sid = s.id as number;
    if (search && !(s.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    if (filterGrp  && s.grp  !== filterGrp)   return false;
    if (filterPaid === "paid"   && !isPaid(sid))  return false;
    if (filterPaid === "unpaid" &&  isPaid(sid))  return false;
    if (filterBirthday && !isBirthday(s))         return false;
    if (filterSport === "sport" && !s.has_sport)  return false;
    if (filterSport === "main"  &&  s.has_sport)  return false;
    return true;
  });

  const activeFilters = (filterHall ? 1 : 0) + (filterGrp ? 1 : 0) + (filterPaid ? 1 : 0) + (filterBirthday ? 1 : 0) + (filterSport ? 1 : 0);
  const resetFilters = () => { setFilterHall(""); setFilterGrp(""); setFilterPaid(""); setFilterBirthday(false); setFilterSport(""); setSearch(""); };

  const Chip = ({ active, onClick, children, activeStyle }: { active: boolean; onClick: () => void; children: React.ReactNode; activeStyle?: React.CSSProperties }) => (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
      style={active ? (activeStyle ?? { background: "hsl(0,72%,40%)", color: "#fff" }) : { background: "#eee", color: "#555" }}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="section-title">ДАННЫЕ</h1>
        {enabled && (
          <button onClick={() => setShowArchive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showArchive ? "border-orange-300 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-500"}`}>
            <Icon name="Archive" size={13} />Архив
          </button>
        )}
      </div>

      {/* Выбор тренера + даты */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
        <select className={inputCls} value={selectedTrainer ?? ""} onChange={e => { setSelectedTrainer(e.target.value ? +e.target.value : null); resetFilters(); }}>
          <option value="">Выберите тренера...</option>
          {(trainers as Record<string, unknown>[]).map(t => (
            <option key={t.id as number} value={t.id as number}>{t.full_name as string}{t.hall ? ` · ${t.hall}` : ""}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Дата (посещения)</div>
            <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Месяц (оплаты)</div>
            <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        </div>
      </div>

      {!enabled && (
        <div className="text-center py-10 text-gray-400">
          <Icon name="Database" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Выберите тренера</p>
        </div>
      )}

      {enabled && sLoad && <Loading />}

      {enabled && !sLoad && (
        <>
          {/* Статы */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold text-gray-700">{allStudents.length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Всего</div>
            </div>
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold text-green-600">{allStudents.filter(s => isPresent(s.id as number)).length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Сегодня</div>
            </div>
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{allStudents.filter(s => isPaid(s.id as number)).length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Оплатили</div>
            </div>
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold" style={{ color: "hsl(265,60%,50%)" }}>
                {allStudents.filter(s => isBirthday(s)).length}
              </div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">ДР сегодня</div>
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
                <Chip active={!filterHall} onClick={() => setFilterHall("")}>Все</Chip>
                {halls.map(h => <Chip key={h} active={filterHall === h} onClick={() => setFilterHall(filterHall === h ? "" : h)}>{h}</Chip>)}
              </div>
            </div>
          )}

          {/* Фильтр по группе */}
          {grps.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Группа</div>
              <div className="flex flex-wrap gap-2">
                <Chip active={!filterGrp} onClick={() => setFilterGrp("")}>Все</Chip>
                {grps.map(g => <Chip key={g} active={filterGrp === g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)}>{g}</Chip>)}
              </div>
            </div>
          )}

          {/* Фильтр по оплате */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Оплата</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={filterPaid === ""} onClick={() => setFilterPaid("")}>Все</Chip>
              <Chip active={filterPaid === "paid"} onClick={() => setFilterPaid(filterPaid === "paid" ? "" : "paid")}
                activeStyle={{ background: "hsl(142,55%,38%)", color: "#fff" }}>✓ Оплатили</Chip>
              <Chip active={filterPaid === "unpaid"} onClick={() => setFilterPaid(filterPaid === "unpaid" ? "" : "unpaid")}>✗ Не оплатили</Chip>
            </div>
          </div>

          {/* Фильтр по типу группы */}
          {hasSport && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Тип группы</div>
              <div className="flex flex-wrap gap-2">
                <Chip active={filterSport === ""} onClick={() => setFilterSport("")}>Все</Chip>
                <Chip active={filterSport === "main"} onClick={() => setFilterSport(filterSport === "main" ? "" : "main")}>🥇 Основная</Chip>
                <Chip active={filterSport === "sport"} onClick={() => setFilterSport(filterSport === "sport" ? "" : "sport")}>🏆 Спортивная</Chip>
              </div>
            </div>
          )}

          {/* Фильтр дни рождения сегодня */}
          <div className="flex flex-wrap gap-2">
            <Chip active={filterBirthday} onClick={() => setFilterBirthday(v => !v)}
              activeStyle={{ background: "hsl(38,90%,50%)", color: "#fff" }}>
              🎂 ДР сегодня
            </Chip>
            {(activeFilters > 0 || search) && (
              <button onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2">
                <Icon name="X" size={12} />Сбросить
              </button>
            )}
          </div>

          {/* Список учеников */}
          <div className="flex flex-col gap-2">
            {filtered.map(s => {
              const sid     = s.id as number;
              const here    = isPresent(sid);
              const paid    = isPaid(sid);
              const birthday = isBirthday(s);
              const certOk  = isCertOk(s);
              const insOk   = isInsOk(s);

              return (
                <div key={sid}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                  style={birthday ? { background: "linear-gradient(135deg,#fffbeb 0%,#fff 60%)" } : undefined}>
                  <div className="p-3 flex items-start gap-2.5">
                    <img
                      src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/45f0f2e8-11f0-4671-89d6-6b0b56fd7d6b.jpg"
                      alt="" className="w-9 h-9 rounded-full object-contain flex-shrink-0"
                      style={{ filter: "grayscale(1) brightness(1.1) opacity(0.6)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] flex items-center gap-1.5 flex-wrap">
                        {s.name as string}
                        {birthday && <span className="text-xs">🎉</span>}
                        {here && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>✓ Присутствует</span>}
                        {paid && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(38,90%,93%)", color: "hsl(38,80%,30%)" }}>₽ Оплачен</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        {[s.hall, s.hall2, s.grp].filter(Boolean).join(" · ")}
                      </div>
                      {s.schedule && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Icon name="Clock" size={10} />{s.schedule as string}
                        </div>
                      )}
                      {s.birthdate && (
                        <div className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5">
                          <Icon name="Cake" size={10} />{(s.birthdate as string).split("-").reverse().join(".")}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.cert
                          ? (certOk ? <span className="badge-present text-[9px]">✓ Справка</span> : <span className="badge-absent text-[9px]">Справка просрочена</span>)
                          : <span className="badge-absent text-[9px]">Нет справки</span>}
                        {s.insurance
                          ? (insOk ? <span className="badge-present text-[9px]">✓ Страховка</span> : <span className="badge-absent text-[9px]">Страховка просрочена</span>)
                          : null}
                        {s.has_sport && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(38,90%,93%)", color: "hsl(38,80%,32%)" }}>🏆 Спорт</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t border-gray-100">
                    <button onClick={() => togglePay(sid, paid)} disabled={toggling.has(`p${sid}`)}
                      className={`flex-1 py-2 text-xs font-bold border-r border-gray-100 transition-all ${paid ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50"}`}>
                      {paid ? "✓ Оплачен (снять)" : "💰 Оплатить"}
                    </button>
                    <button onClick={() => toggleAtt(sid, here)} disabled={toggling.has(`a${sid}`)}
                      className={`flex-1 py-2 text-xs font-bold transition-all ${here ? "bg-green-50 text-green-700" : "text-white"}`}
                      style={!here ? { background: "hsl(0,72%,40%)" } : undefined}>
                      {here ? "✅ Был (снять)" : "● Отметить посещение"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Icon name="Users" size={32} className="mx-auto mb-2 opacity-20" />
                {allStudents.length === 0 ? "Нет учеников" : "Ничего не найдено"}
              </div>
            )}
          </div>

          {/* Архив */}
          {showArchive && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-1.5">
                <Icon name="Archive" size={12} className="text-orange-500" />
                <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">Архив ({(archived as []).length})</span>
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
