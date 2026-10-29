import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

type Props = { month: string; trainerId?: number | null; cacheKey: string };

export default function StudentMovement({ month, trainerId, cacheKey }: Props) {
  const [view, setView] = useState<"month" | "year">("month");
  const [year, setYear] = useState(month.slice(0, 4));
  const [open, setOpen] = useState(false);
  const tid = trainerId ?? undefined;

  const { data: m } = useQuery({
    queryKey: ["stats-month", cacheKey, month, tid],
    queryFn: () => reportsApi.statsMonth(month, tid),
  });
  const { data: y } = useQuery({
    queryKey: ["stats-year", cacheKey, year, tid],
    queryFn: () => reportsApi.statsYear(year, tid),
    enabled: view === "year",
  });

  const shiftYear = (d: number) => setYear(String(Number(year) + d));

  const exportYear = () => {
    if (!y) return;
    const rows: (string | number)[][] = [["Месяц", "Новые", "Выбыли", "Итого"]];
    (y.months as Record<string, unknown>[]).forEach((r, i) => rows.push([MONTHS[i], r.joined as number, r.left as number, (r.joined as number) - (r.left as number)]));
    rows.push(["Всего за год", y.total_joined, y.total_left, y.total_joined - y.total_left]);
    if ((y.by_trainer || []).length) {
      rows.push([], ["Тренер", "Новые", "Выбыли", "Итого"]);
      (y.by_trainer as Record<string, unknown>[]).forEach(t => rows.push([t.trainer_name as string, t.joined as number, t.left as number, (t.joined as number) - (t.left as number)]));
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = `движение_учеников_${year}.csv`;
    a.click();
  };

  const joined = (m?.joined as number) || 0;
  const left = (m?.left as number) || 0;
  const events = (m?.events as Record<string, unknown>[]) || [];
  const byTrainerM = (m?.by_trainer as Record<string, unknown>[]) || [];

  const Tab = ({ id, children }: { id: "month" | "year"; children: React.ReactNode }) => (
    <button onClick={() => setView(id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
      style={view === id ? { background: "hsl(0,72%,40%)", color: "#fff" } : { background: "#eee", color: "#555" }}>{children}</button>
  );

  const Num = ({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) => (
    <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: bg }}>
      <div className="text-xl font-oswald font-bold leading-none" style={{ color }}>{value}</div>
      <div className="text-[10px] font-semibold text-gray-500 mt-1">{label}</div>
    </div>
  );

  const fmtDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon name="UsersRound" size={15} className="text-gray-400" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Движение учеников</span>
      </div>

      <div className="flex gap-2">
        <Tab id="month">За месяц</Tab>
        <Tab id="year">За год</Tab>
      </div>

      {view === "month" && (
        <>
          <div className="flex gap-2">
            <Num label="Новые" value={`+${joined}`} color="hsl(142,55%,30%)" bg="hsl(142,50%,95%)" />
            <Num label="Выбыли" value={`−${left}`} color="hsl(0,72%,40%)" bg="hsl(0,72%,96%)" />
            <Num label="Итого" value={`${joined - left > 0 ? "+" : ""}${joined - left}`} color="hsl(220,15%,30%)" bg="hsl(220,15%,95%)" />
          </div>

          {byTrainerM.length > 0 && (
            <div className="flex flex-col divide-y divide-gray-50">
              {byTrainerM.map(t => (
                <div key={t.trainer_id as number} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="font-semibold text-gray-700 truncate pr-2">{t.trainer_name as string}</span>
                  <span className="flex gap-3 flex-shrink-0 font-bold">
                    <span style={{ color: "hsl(142,55%,30%)" }}>+{t.joined as number}</span>
                    <span style={{ color: "hsl(0,72%,40%)" }}>−{t.left as number}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <>
              <button onClick={() => setOpen(v => !v)} className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <Icon name={open ? "ChevronUp" : "ChevronDown"} size={13} />
                {open ? "Скрыть список" : "Показать кто именно"}
              </button>
              {open && (
                <div className="flex flex-col divide-y divide-gray-50">
                  {events.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 text-xs">
                      <span className="font-bold w-4 flex-shrink-0" style={{ color: e.type === "joined" ? "hsl(142,55%,30%)" : "hsl(0,72%,40%)" }}>
                        {e.type === "joined" ? "+" : "−"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-700">{e.name as string}</div>
                        {(e.reason || (byTrainerM.length > 0 && e.trainer_name)) && (
                          <div className="text-[10px] text-gray-400">
                            {[byTrainerM.length > 0 ? (e.trainer_name as string) : "", e.reason as string].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(e.date as string)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {events.length === 0 && <div className="text-xs text-gray-400 text-center py-1">За этот месяц изменений нет</div>}
        </>
      )}

      {view === "year" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => shiftYear(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <span className="font-oswald font-bold text-gray-700">{year}</span>
            <button onClick={() => shiftYear(1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600">
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>

          {!y && <div className="text-xs text-gray-400 text-center py-2">Загрузка...</div>}
          {y && (
            <>
              <div className="flex gap-2">
                <Num label="Новые за год" value={`+${y.total_joined}`} color="hsl(142,55%,30%)" bg="hsl(142,50%,95%)" />
                <Num label="Выбыли за год" value={`−${y.total_left}`} color="hsl(0,72%,40%)" bg="hsl(0,72%,96%)" />
                <Num label="Итого" value={`${y.total_joined - y.total_left > 0 ? "+" : ""}${y.total_joined - y.total_left}`} color="hsl(220,15%,30%)" bg="hsl(220,15%,95%)" />
              </div>

              <div className="flex flex-col divide-y divide-gray-50">
                {(y.months as Record<string, unknown>[]).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="font-semibold text-gray-700">{MONTHS[i]}</span>
                    <span className="flex gap-3 font-bold">
                      <span style={{ color: r.joined ? "hsl(142,55%,30%)" : "#bbb" }}>+{r.joined as number}</span>
                      <span style={{ color: r.left ? "hsl(0,72%,40%)" : "#bbb" }}>−{r.left as number}</span>
                    </span>
                  </div>
                ))}
              </div>

              {(y.by_trainer || []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">По тренерам за год</div>
                  <div className="flex flex-col divide-y divide-gray-50">
                    {(y.by_trainer as Record<string, unknown>[]).map(t => (
                      <div key={t.trainer_id as number} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="font-semibold text-gray-700 truncate pr-2">{t.trainer_name as string}</span>
                        <span className="flex gap-3 flex-shrink-0 font-bold">
                          <span style={{ color: "hsl(142,55%,30%)" }}>+{t.joined as number}</span>
                          <span style={{ color: "hsl(0,72%,40%)" }}>−{t.left as number}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={exportYear}
                className="self-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
                <Icon name="Download" size={13} />Скачать отчёт за {year} (CSV)
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
