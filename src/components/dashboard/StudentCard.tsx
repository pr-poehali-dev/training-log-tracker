import Icon from "@/components/ui/icon";

interface StudentCardProps {
  s: Record<string, unknown>;
  paid: boolean;
  isPresentMain: boolean;
  isPresentSport: boolean;
  togglingPay: boolean;
  togglingMain: boolean;
  togglingSport: boolean;
  canEdit: boolean;
  certOk: boolean;
  insOk: boolean;
  birthday: boolean;
  newStudent: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onMarkPay: () => void;
  onMarkMain: () => void;
  onMarkSport: () => void;
}

// Конфиг канки (цветная полоска) по уровню состава
const TEAM_LEVEL_CONFIG = {
  national: { color: "hsl(0,72%,40%)",  bg: "hsl(0,72%,97%)",  label: "Сборная",  stripe: 4 },
  first:    { color: "hsl(42,90%,42%)", bg: "hsl(42,95%,94%)", label: "1 состав", stripe: 4 },
  regular:  { color: "",                bg: "",                 label: "",         stripe: 0 },
} as const;

export function StudentCard({
  s, paid, isPresentMain, isPresentSport,
  togglingPay, togglingMain, togglingSport,
  canEdit, certOk, insOk, birthday, newStudent,
  onEdit, onArchive, onMarkPay, onMarkMain, onMarkSport,
}: StudentCardProps) {
  const attended = isPresentMain; // спорт — отдельно, не влияет на основное посещение
  const teamLevel = ((s.team_level as string) || "regular") as keyof typeof TEAM_LEVEL_CONFIG;
  const cfg = TEAM_LEVEL_CONFIG[teamLevel] ?? TEAM_LEVEL_CONFIG.regular;
  const hasLevel = teamLevel !== "regular";

  // Зал + группа — строка под именем
  const hallLine = [s.hall, s.hall2].filter(Boolean).join(" · ");
  const grpLine  = [s.grp, s.lvl].filter(Boolean).join(" ");
  const subLine  = [hallLine, grpLine].filter(Boolean).join("  ·  ");

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">

      {/* Цветная канка по составу */}
      {hasLevel && (
        <div style={{ height: cfg.stripe, background: cfg.color }} />
      )}

      {/* Водяной знак — логотип справа */}
      <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 90, zIndex: 0 }}>
        <img
          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
          alt=""
          style={{ position: "absolute", width: 96, height: 96, opacity: 0.045, right: -10, top: "50%", transform: "translateY(-50%)", objectFit: "contain", filter: "grayscale(1)" }}
        />
      </div>

      {/* ── Верхняя часть ── */}
      <div className="p-3 pb-2 flex items-start gap-3 relative z-10">

        {/* Аватар — эмблема Киокушин, цвет по составу */}
        {birthday ? (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 bg-yellow-50">🎂</div>
        ) : (
          <img
            src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/45f0f2e8-11f0-4671-89d6-6b0b56fd7d6b.jpg"
            alt=""
            className="w-11 h-11 object-contain flex-shrink-0 rounded-full"
            style={{
              filter: teamLevel === "national"
                ? "none"
                : teamLevel === "first"
                ? "sepia(1) saturate(5) hue-rotate(5deg) brightness(1.05)"
                : "grayscale(1) brightness(1.15) opacity(0.7)",
            }}
          />
        )}

        {/* Инфо блок */}
        <div className="flex-1 min-w-0">

          {/* Строка с именем и бейджами */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[14px] text-gray-900 leading-tight">
              {s.name as string}
            </span>
            {newStudent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white leading-none"
                style={{ background: "hsl(265,60%,55%)" }}>
                NEW
              </span>
            )}
            {hasLevel && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            )}
            {birthday && <span className="text-xs">🎉</span>}
          </div>

          {/* Зал · Группа */}
          {subLine && (
            <div className="text-[11px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wide leading-tight">
              {subLine}
            </div>
          )}

          {/* Расписание + дата */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {s.schedule && (
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <Icon name="Clock" size={11} />
                <span>{s.schedule as string}</span>
              </div>
            )}
            {s.created_at && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Icon name="CalendarDays" size={11} />
                <span>с {new Date(s.created_at as string).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </div>
            )}
          </div>

          {/* Бейджи — тип группы + документы */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {s.has_sport ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(38,90%,93%)", color: "hsl(38,80%,32%)" }}>
                🏆 Спортивная
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#f3f4f6", color: "#6b7280" }}>
                🥇 Основная
              </span>
            )}
            {!s.cert && <span className="badge-absent">Нет справки</span>}
            {s.cert && !certOk && <span className="badge-absent">Справка !</span>}
            {s.insurance && !insOk && <span className="badge-absent">Страховка !</span>}
            {s.annual_fee_number && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                № {s.annual_fee_number as string}
              </span>
            )}
          </div>
        </div>

        {/* Карандаш + три точки */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <button onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
            <Icon name="Pencil" size={15} />
          </button>
          <button onClick={onArchive}
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
            <Icon name="MoreVertical" size={15} />
          </button>
        </div>
      </div>

      {/* ── Нижняя панель кнопок ── */}
      <div className="flex border-t border-gray-100 relative z-10" style={{ minHeight: 44 }}>

        {/* Справка */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
          <Icon name="FileText" size={15} />
          <span>Справка</span>
        </button>

        {/* Оплата */}
        <button
          disabled={togglingPay || paid}
          onClick={paid ? undefined : onMarkPay}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors border-r border-gray-100"
          style={{ color: paid ? "hsl(142,55%,35%)" : "#6b7280" }}>
          <Icon name="CircleDollarSign" size={15} />
          <span>{togglingPay ? "..." : "Оплата"}</span>
        </button>

        {/* Отметить посещение — основная группа */}
        {canEdit && (
          attended ? (
            <div className="flex-[1.8] flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold"
              style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}>
              <Icon name="Check" size={14} />
              <span>Посещение</span>
            </div>
          ) : (
            <button
              disabled={togglingMain}
              onClick={onMarkMain}
              className="flex-[1.8] flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-white active:opacity-80 disabled:opacity-60 transition-all"
              style={{ background: "hsl(0,72%,40%)" }}>
              <Icon name="Check" size={14} />
              <span>{togglingMain ? "..." : "Отметить посещение"}</span>
            </button>
          )
        )}

        {/* Спортивная группа — отдельная независимая кнопка */}
        {s.has_sport && canEdit && (
          isPresentSport ? (
            <div
              className="px-3 py-2 text-[11px] font-bold border-l border-gray-100 flex items-center gap-1"
              style={{ color: "hsl(200,70%,35%)", background: "hsl(200,55%,93%)" }}>
              <Icon name="Trophy" size={13} />
              <span>Спорт ✓</span>
            </div>
          ) : (
            <button
              disabled={togglingSport}
              onClick={onMarkSport}
              className="px-3 py-2 text-[11px] font-bold transition-all border-l border-gray-100 flex items-center gap-1 active:opacity-70 disabled:opacity-50"
              style={{ color: "hsl(200,70%,45%)" }}>
              <Icon name="Trophy" size={13} />
              <span>{togglingSport ? "..." : "Спорт"}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}