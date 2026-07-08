import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, studentsApi, attendanceApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { calcAge, ageLabel } from "@/components/dashboard/trainer-ui";
import type { AppUser } from "@/pages/Index";

const todayStr  = () => new Date().toISOString().slice(0, 10);
const monStr    = () => new Date().toISOString().slice(0, 7);
const todayMMDD = () => new Date().toISOString().slice(5, 10);
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";

function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

export default function SupervisorDashboard({ user: _user }: { user: AppUser }) {
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());
  const [search, setSearch] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterBirthday, setFilterBirthday] = useState(false);
  const [filterSport, setFilterSport] = useState<"" | "main" | "sport">("");

  const today   = todayStr();
  const todayMD = todayMMDD();

  const { data: trainers = [] } = useQuery({ queryKey: ["trainers-list"], queryFn: () => authApi.trainersList() });
  const enabled = selectedTrainer !== null;

  const { data: students = [], isLoading: sLoad } = useQuery({
    queryKey: ["students-supervisor", selectedTrainer],
    queryFn: () => studentsApi.list(selectedTrainer!),
    enabled,
  });
  const { data: attData = [] } = useQuery({
    queryKey: ["att-supervisor", date, selectedTrainer],
    queryFn: () => attendanceApi.byDate(date, selectedTrainer!),
    enabled,
  });
  const { data: attMonth = [] } = useQuery({
    queryKey: ["att-month-supervisor", month, selectedTrainer],
    queryFn: () => attendanceApi.byMonth(month, selectedTrainer!),
    enabled,
  });

  const isPresent      = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present && (a.group_type ?? "main") === "main");
  const isPresentSport = (sid: number) => (attData as Record<string, unknown>[]).some(a => a.student_id === sid && a.present && a.group_type === "sport");
  const isBirthday = (s: Record<string, unknown>) => s.birthdate && (s.birthdate as string).slice(5) === todayMD;
  const isCertOk   = (s: Record<string, unknown>) => s.cert_to && (s.cert_to as string) >= today;
  const isInsOk    = (s: Record<string, unknown>) => s.insurance && s.insurance_to && (s.insurance_to as string) >= today;

  const trainingDaysInMonth = (sid: number) =>
    new Set((attMonth as Record<string, unknown>[])
      .filter(a => a.student_id === sid && (a.group_type ?? "main") === "main")
      .map(a => a.date as string)).size;
  const presentDaysInMonth = (sid: number) =>
    new Set((attMonth as Record<string, unknown>[])
      .filter(a => a.student_id === sid && a.present && (a.group_type ?? "main") === "main")
      .map(a => a.date as string)).size;

  const allStudents = students as Record<string, unknown>[];
  const halls   = [...new Set([...allStudents.map(s => s.hall as string), ...allStudents.map(s => s.hall2 as string)].filter(Boolean))];
  const grps    = [...new Set(allStudents.map(s => s.grp as string).filter(Boolean))];
  const hasSport = allStudents.some(s => s.has_sport);

  const filtered = allStudents.filter(s => {
    if (search && !(s.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    if (filterGrp  && s.grp  !== filterGrp)   return false;
    if (filterBirthday && !isBirthday(s))     return false;
    if (filterSport === "sport" && !s.has_sport) return false;
    if (filterSport === "main"  &&  s.has_sport) return false;
    return true;
  });

  const activeFilters = (filterHall ? 1 : 0) + (filterGrp ? 1 : 0) + (filterBirthday ? 1 : 0) + (filterSport ? 1 : 0);
  const resetFilters = () => { setFilterHall(""); setFilterGrp(""); setFilterBirthday(false); setFilterSport(""); setSearch(""); };

  const Chip = ({ active, onClick, children, activeStyle }: { active: boolean; onClick: () => void; children: React.ReactNode; activeStyle?: React.CSSProperties }) => (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
      style={active ? (activeStyle ?? { background: "hsl(0,72%,40%)", color: "#fff" }) : { background: "#eee", color: "#555" }}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="section-title">ЖУРНАЛ ПОСЕЩАЕМОСТИ</h1>
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
            <div className="text-[10px] text-gray-400 mb-1">Месяц (статистика)</div>
            <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        </div>
      </div>

      {!enabled && (
        <div className="text-center py-10 text-gray-400">
          <Icon name="CalendarCheck2" size={40} className="mx-auto mb-2 opacity-20" />
          <p>Выберите тренера</p>
        </div>
      )}

      {enabled && sLoad && <Loading />}

      {enabled && !sLoad && (
        <>
          {/* Статы — только посещаемость, без денег */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold text-gray-700">{allStudents.length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Всего</div>
            </div>
            <div className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-gray-100">
              <div className="text-xl font-oswald font-bold text-green-600">{allStudents.filter(s => isPresent(s.id as number)).length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Сегодня</div>
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

          {/* Список учеников — только просмотр */}
          <div className="flex flex-col gap-2">
            {filtered.map(s => {
              const sid       = s.id as number;
              const here      = isPresent(sid);
              const hereSport = isPresentSport(sid);
              const hasSportG = Boolean(s.has_sport);
              const birthday  = isBirthday(s);
              const certOk    = isCertOk(s);
              const insOk     = isInsOk(s);
              const trainingDays = trainingDaysInMonth(sid);
              const presentDays  = presentDaysInMonth(sid);
              const rate = trainingDays > 0 ? Math.round(presentDays / trainingDays * 100) : null;

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
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        {[s.hall, s.hall2, s.grp].filter(Boolean).join(" · ")}
                      </div>
                      {s.schedule && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Icon name="Clock" size={10} />{s.schedule as string}
                        </div>
                      )}
                      {s.birthdate && calcAge(s.birthdate as string) !== null && (
                        <div className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5">
                          <Icon name="Cake" size={10} />{ageLabel(calcAge(s.birthdate as string)!)}
                        </div>
                      )}
                      {rate !== null && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Icon name="TrendingUp" size={10} />
                          Посещаемость за месяц: {presentDays}/{trainingDays} ({rate}%)
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.cert
                          ? (certOk ? <span className="badge-present text-[9px]">✓ Справка</span> : <span className="badge-absent text-[9px]">Справка просрочена</span>)
                          : <span className="badge-absent text-[9px]">Нет справки</span>}
                        {s.insurance
                          ? (insOk ? <span className="badge-present text-[9px]">✓ Страховка</span> : <span className="badge-absent text-[9px]">Страховка просрочена</span>)
                          : null}
                        {hasSportG && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(200,55%,93%)", color: "hsl(200,60%,32%)" }}>🏆 Спорт</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasSportG && (
                    <div className="flex border-t border-gray-100">
                      <div className="flex-1 px-3 py-2 text-xs font-semibold text-center"
                        style={hereSport ? { background: "hsl(200,55%,96%)", color: "hsl(200,70%,35%)" } : { color: "#9ca3af" }}>
                        <Icon name="Trophy" size={12} className="inline mr-1" />
                        {hereSport ? "Спорт: присутствует" : "Спорт: не отмечен"}
                      </div>
                    </div>
                  )}
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
        </>
      )}
    </div>
  );
}