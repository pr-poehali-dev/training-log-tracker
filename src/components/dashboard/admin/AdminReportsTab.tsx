import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

const monStr = () => new Date().toISOString().slice(0, 7);
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";
const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

function MiniBar({ value, max, color = "hsl(0,72%,40%)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const Chip = ({ active, onClick, children, activeStyle }: {
  active: boolean; onClick: () => void; children: React.ReactNode; activeStyle?: React.CSSProperties;
}) => (
  <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
    style={active ? (activeStyle ?? { background: "hsl(0,72%,40%)", color: "#fff" }) : { background: "#eee", color: "#555" }}>
    {children}
  </button>
);

export default function AdminReportsTab() {
  const [month, setMonth] = useState(monStr());
  const [trainerId, setTrainerId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [filterGrp, setFilterGrp] = useState("");
  const [filterPaid, setFilterPaid] = useState<"" | "paid" | "unpaid">("");
  const [filterSport, setFilterSport] = useState<"" | "main" | "sport">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: trainers = [] } = useQuery({ queryKey: ["trainers"], queryFn: () => authApi.trainers() });
  const { data, isLoading } = useQuery({
    queryKey: ["reports-admin", month, trainerId],
    queryFn: () => reportsApi.get(month, trainerId ?? undefined),
  });

  const [filterTrainerHall, setFilterTrainerHall] = useState("");

  const summary = data?.summary || {};
  const allStudents: Record<string, unknown>[] = data?.students || [];
  const allTrainerRows: Record<string, unknown>[] = data?.trainers || [];

  // Залы тренеров (для режима "Все тренеры")
  const trainerHalls = [...new Set(allTrainerRows.map(t => t.hall as string).filter(Boolean))];
  const trainerRows = filterTrainerHall
    ? allTrainerRows.filter(t => t.hall === filterTrainerHall)
    : allTrainerRows;

  // Итоги с учётом выбранного зала
  const hallSubs  = trainerRows.reduce((s, t) => s + (t.subs_rev as number), 0);
  const hallPers  = trainerRows.reduce((s, t) => s + (t.pers_rev as number), 0);
  const hallTotal = hallSubs + hallPers;
  const hallStudents = trainerRows.reduce((s, t) => s + (t.student_count as number), 0);

  // Фильтры по ученикам (учитываем оба зала: hall и hall2)
  const halls  = [...new Set(allStudents.flatMap(s => [s.hall as string, s.hall2 as string]).filter(Boolean))];
  const grps   = [...new Set(allStudents.map(s => s.grp  as string).filter(Boolean))];
  const hasSport = allStudents.some(s => s.has_sport);

  const students = allStudents.filter(s => {
    if (search && !(s.name as string)?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterHall && s.hall !== filterHall && s.hall2 !== filterHall) return false;
    if (filterGrp  && s.grp  !== filterGrp)  return false;
    if (filterPaid === "paid"   && !s.paid)  return false;
    if (filterPaid === "unpaid" &&  s.paid)  return false;
    if (filterSport === "sport" && !s.has_sport) return false;
    if (filterSport === "main"  &&  s.has_sport) return false;
    return true;
  });

  const activeFilters = (filterHall ? 1 : 0) + (filterGrp ? 1 : 0) + (filterPaid ? 1 : 0) + (filterSport ? 1 : 0);
  const resetFilters = () => { setFilterHall(""); setFilterGrp(""); setFilterPaid(""); setFilterSport(""); setSearch(""); };

  const maxRev = Math.max(...trainerRows.map(t => t.total_rev as number), 1);

  const exportCsv = () => {
    const headers = trainerId
      ? ["Ученик", "Зал", "Зал 2", "Группа", "Расписание", "Тип", "Присутствовал/Всего", "Спорт", "Перс.", "%", "Оплата", "Абонемент ₽"]
      : ["Тренер", "Зал", "Учеников", "Абонементы ₽", "Персональные ₽", "Итого ₽"];
    const rows = trainerId
      ? students.map(s => [
          s.name, s.hall, s.hall2 || "", s.grp || "", s.schedule || "",
          s.has_sport ? "Спорт+Осн." : "Основная",
          `${s.present_count}/${s.total_days}`,
          s.present_sport || 0,
          s.personal_count,
          s.attendance_rate + "%",
          s.paid ? "Оплачен" : "Не оплачен",
          s.paid ? s.fee : 0,
        ])
      : trainerRows.map(t => [t.full_name, t.hall, t.student_count, t.subs_rev, t.pers_rev, t.total_rev]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = `отчёт_${month}${trainerId ? "_тренер" : ""}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="section-title">ОТЧЁТЫ</h1>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
          <Icon name="Download" size={13} />CSV
        </button>
      </div>

      {/* Фильтры верхнего уровня */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Месяц</div>
            <input type="month" className={inputCls} value={month} onChange={e => { setMonth(e.target.value); resetFilters(); }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Тренер</div>
            <select className={inputCls} value={trainerId ?? ""} onChange={e => { setTrainerId(e.target.value ? +e.target.value : null); resetFilters(); }}>
              <option value="">Все тренеры</option>
              {(trainers as Record<string, unknown>[]).map(t => (
                <option key={t.id as number} value={t.id as number}>{t.full_name as string}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && <Loading />}

      {!isLoading && (
        <>
          {/* Фильтр по залам (режим "Все тренеры") */}
          {!trainerId && trainerHalls.length > 0 && (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-1.5">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Зал</div>
              <div className="flex flex-wrap gap-2">
                <Chip active={!filterTrainerHall} onClick={() => setFilterTrainerHall("")}>Все залы</Chip>
                {trainerHalls.map(h => (
                  <Chip key={h} active={filterTrainerHall === h} onClick={() => setFilterTrainerHall(filterTrainerHall === h ? "" : h)}>{h}</Chip>
                ))}
              </div>
            </div>
          )}

          {/* Итоговые статы */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-2xl font-oswald font-bold text-gray-700">{!trainerId ? hallStudents : (summary.total_students || 0)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Учеников</div>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
              <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(142,55%,38%)" }}>{summary.paid_count || 0}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Оплатили</div>
            </div>
            {summary.total_revenue !== undefined && (
              <>
                <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
                  <div className="text-xl font-oswald font-bold" style={{ color: "hsl(0,72%,40%)" }}>{(!trainerId ? hallSubs : (summary.subs_revenue || 0)).toLocaleString("ru")} ₽</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Абонементы</div>
                </div>
                <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
                  <div className="text-xl font-oswald font-bold text-purple-600">{(!trainerId ? hallPers : (summary.pers_revenue || 0)).toLocaleString("ru")} ₽</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Доп. трен.</div>
                </div>
              </>
            )}
          </div>

          {summary.total_revenue !== undefined && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "hsl(0,72%,40%)" }}>
              <div className="text-2xl font-oswald font-bold text-white">{(!trainerId ? hallTotal : (summary.total_revenue || 0)).toLocaleString("ru")} ₽</div>
              <div className="text-xs text-red-200 mt-1">
                {!trainerId && filterTrainerHall ? `Итого по залу «${filterTrainerHall}»` : "Итого выручка за месяц"}
              </div>
            </div>
          )}

          {/* ── Таблица по ВСЕМ тренерам ── */}
          {!trainerId && trainerRows.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <Icon name="Users" size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">По тренерам</span>
              </div>
              <div className="divide-y divide-gray-50">
                {trainerRows.map(t => (
                  <div key={t.id as number} className="px-3 py-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{t.full_name as string}</span>
                        {t.hall && <span className="text-[11px] text-gray-400 ml-2">{t.hall as string}</span>}
                      </div>
                      <span className="font-oswald font-bold text-sm" style={{ color: "hsl(0,72%,40%)" }}>
                        {(t.total_rev as number).toLocaleString("ru")} ₽
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mb-1.5">
                      {t.student_count as number} уч. · абон. {(t.subs_rev as number).toLocaleString("ru")} ₽ · перс. {(t.pers_rev as number).toLocaleString("ru")} ₽
                    </div>
                    <MiniBar value={t.total_rev as number} max={maxRev} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Детали по конкретному тренеру ── */}
          {trainerId && (
            <>
              {/* Фильтры учеников */}
              <div className="flex flex-col gap-3">
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

                {halls.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Зал</div>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={!filterHall} onClick={() => setFilterHall("")}>Все</Chip>
                      {halls.map(h => <Chip key={h} active={filterHall === h} onClick={() => setFilterHall(filterHall === h ? "" : h)}>{h}</Chip>)}
                    </div>
                  </div>
                )}

                {grps.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Группа</div>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={!filterGrp} onClick={() => setFilterGrp("")}>Все</Chip>
                      {grps.map(g => <Chip key={g} active={filterGrp === g} onClick={() => setFilterGrp(filterGrp === g ? "" : g)}>{g}</Chip>)}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Оплата</div>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={filterPaid === ""} onClick={() => setFilterPaid("")}>Все</Chip>
                    <Chip active={filterPaid === "paid"} onClick={() => setFilterPaid(filterPaid === "paid" ? "" : "paid")}
                      activeStyle={{ background: "hsl(142,55%,38%)", color: "#fff" }}>✓ Оплатили</Chip>
                    <Chip active={filterPaid === "unpaid"} onClick={() => setFilterPaid(filterPaid === "unpaid" ? "" : "unpaid")}>✗ Должники</Chip>
                  </div>
                </div>

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

                {(activeFilters > 0 || search) && (
                  <button onClick={resetFilters} className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                    <Icon name="X" size={12} />Сбросить фильтры
                  </button>
                )}
              </div>

              {/* Карточки учеников */}
              <div className="flex flex-col gap-2">
                {students.map(s => {
                  const pct = s.attendance_rate as number;
                  const pctColor = pct >= 75 ? "hsl(142,60%,40%)" : pct >= 50 ? "hsl(38,90%,45%)" : "hsl(0,72%,40%)";
                  const isExpanded = expandedId === (s.id as number);

                  return (
                    <div key={s.id as number} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                      {/* Основная строка */}
                      <button
                        className="w-full p-3 flex items-center gap-3 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : s.id as number)}
                      >
                        <img
                          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/45f0f2e8-11f0-4671-89d6-6b0b56fd7d6b.jpg"
                          alt="" className="w-9 h-9 rounded-full object-contain flex-shrink-0"
                          style={{ filter: "grayscale(1) brightness(1.1) opacity(0.6)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[13px] text-gray-900 truncate">{s.name as string}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
                            {[s.hall, s.hall2].filter(Boolean).join(" · ")}
                            {s.grp ? ` · ${s.grp}` : ""}
                            {s.schedule ? ` · ${s.schedule}` : ""}
                          </div>
                          <div className="mt-1.5">
                            <MiniBar value={pct} max={100} color={pctColor} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-oswald font-bold text-base" style={{ color: pctColor }}>{pct}%</span>
                          <div className="flex gap-1">
                            {s.paid
                              ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>✓</span>
                              : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,50%)" }}>✗</span>}
                          </div>
                          <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-gray-300" />
                        </div>
                      </button>

                      {/* Раскрытые детали */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-3 pb-3 pt-2.5 flex flex-col gap-2">
                          {/* Посещаемость основной группы */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-50 rounded-xl p-2 text-center">
                              <div className="text-sm font-oswald font-bold text-gray-700">{s.present_count as number}</div>
                              <div className="text-[9px] text-gray-400 uppercase">Был(а)</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2 text-center">
                              <div className="text-sm font-oswald font-bold text-gray-700">{s.total_days as number}</div>
                              <div className="text-[9px] text-gray-400 uppercase">Занятий</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2 text-center">
                              <div className="text-sm font-oswald font-bold" style={{ color: pctColor }}>{pct}%</div>
                              <div className="text-[9px] text-gray-400 uppercase">Посещ.</div>
                            </div>
                          </div>

                          {/* Спортивная группа */}
                          {s.has_sport && (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-blue-50 rounded-lg px-2.5 py-1.5">
                              <span>🏆</span>
                              <span>Спортивная: был(а) <strong>{s.present_sport as number}</strong> тренировок</span>
                            </div>
                          )}

                          {/* Персональные тренировки */}
                          {(s.personal_count as number) > 0 && (
                            <div className="flex items-center justify-between text-[11px] bg-purple-50 rounded-lg px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5 text-purple-700">
                                <Icon name="User" size={12} />
                                <span>Персональных: <strong>{s.personal_count as number}</strong></span>
                              </div>
                              {(s.personal_revenue as number) > 0 && (
                                <span className="font-bold text-purple-700">{(s.personal_revenue as number).toLocaleString("ru")} ₽</span>
                              )}
                            </div>
                          )}

                          {/* Оплата */}
                          <div className="flex items-center justify-between text-[11px] rounded-lg px-2.5 py-1.5"
                            style={{ background: s.paid ? "hsl(142,50%,93%)" : "hsl(0,72%,97%)" }}>
                            <span style={{ color: s.paid ? "hsl(142,55%,30%)" : "hsl(0,72%,45%)" }}>
                              {s.paid ? "✓ Абонемент оплачен" : "✗ Не оплачен"}
                            </span>
                            {s.paid && s.fee && (
                              <span className="font-bold" style={{ color: "hsl(142,55%,30%)" }}>{(s.fee as number).toLocaleString("ru")} ₽</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {students.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <Icon name="BarChart2" size={32} className="mx-auto mb-2 opacity-20" />
                    {allStudents.length === 0 ? "Нет данных за этот месяц" : "Ничего не найдено"}
                  </div>
                )}
              </div>
            </>
          )}

          {students.length === 0 && trainerRows.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">Нет данных за этот месяц</div>
          )}
        </>
      )}
    </div>
  );
}