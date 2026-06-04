import Icon from "@/components/ui/icon";
import { ini } from "./trainer-ui";

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

// Цвета канки по уровню состава
const TEAM_LEVEL_CONFIG = {
  national: { color: "hsl(0,72%,40%)",   bg: "hsl(0,72%,97%)",   label: "Сборная",   thick: 4 },
  first:    { color: "hsl(38,85%,45%)",  bg: "hsl(38,90%,96%)",  label: "1 состав",  thick: 4 },
  regular:  { color: "transparent",      bg: "transparent",       label: "",          thick: 0 },
} as const;

export function StudentCard({
  s, paid, isPresentMain, isPresentSport,
  togglingPay, togglingMain, togglingSport,
  canEdit, certOk, insOk, birthday, newStudent,
  onEdit, onArchive, onMarkPay, onMarkMain, onMarkSport,
}: StudentCardProps) {
  const attended = isPresentMain || isPresentSport;
  const teamLevel = (s.team_level as string || "regular") as keyof typeof TEAM_LEVEL_CONFIG;
  const teamCfg = TEAM_LEVEL_CONFIG[teamLevel] ?? TEAM_LEVEL_CONFIG.regular;
  const hasTeamLevel = teamLevel !== "regular";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative"
      style={birthday ? { background: "linear-gradient(135deg, #fffbeb 0%, #fff 70%)" } : undefined}
    >
      {/* Цветная канка-полоска сверху */}
      {hasTeamLevel && (
        <div style={{ height: teamCfg.thick, background: teamCfg.color, width: "100%" }} />
      )}

      {/* Иероглиф-водяной знак справа — как на макете */}
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none select-none overflow-hidden"
        style={{ width: 90, zIndex: 0 }}
      >
        <img
          src="https://cdn.poehali.dev/projects/c5550cb0-cdea-4800-869d-21e6a7620cbd/bucket/d8f60ced-a474-4574-96b4-de28c3629a94.png"
          alt=""
          className="absolute"
          style={{
            width: 100,
            height: 100,
            opacity: 0.045,
            right: -10,
            top: "50%",
            transform: "translateY(-50%)",
            objectFit: "contain",
            filter: "grayscale(1)",
          }}
        />
      </div>

      {/* Верхняя часть карточки */}
      <div className="p-3 pb-2.5 flex items-start gap-3 relative z-10">

        {/* Аватар с инициалами */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-oswald font-bold text-sm flex-shrink-0"
          style={
            birthday
              ? { background: "#fef3c7", color: "#d97706" }
              : hasTeamLevel
              ? { background: teamCfg.bg, color: teamCfg.color }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          {birthday ? "🎂" : ini(s.name as string)}
        </div>

        {/* Основная инфа */}
        <div className="flex-1 min-w-0 pr-2">

          {/* Имя + бейджи */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-[13px] text-gray-900 leading-tight">
              {s.name as string}
            </span>
            {/* Бейдж состава */}
            {hasTeamLevel && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: teamCfg.bg, color: teamCfg.color, border: `1px solid ${teamCfg.color}` }}
              >
                {teamCfg.label}
              </span>
            )}
            {newStudent && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
                style={{ background: "hsl(265,60%,55%)" }}
              >
                NEW
              </span>
            )}
            {birthday && <span className="text-xs">🎉</span>}
          </div>

          {/* Зал · Время */}
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium leading-tight">
            {[s.hall, s.hall2].filter(Boolean).join(" · ")}
            {s.grp ? ` · ${s.grp}` : ""}
          </div>

          {/* Расписание */}
          {s.schedule && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
              <Icon name="Clock" size={10} />
              <span>{s.schedule as string}</span>
            </div>
          )}

          {/* Дата начала */}
          {s.created_at && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-300">
              <Icon name="CalendarDays" size={10} />
              <span>с {new Date(s.created_at as string).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
            </div>
          )}

          {/* Бейджи */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {/* Тип группы */}
            {s.has_sport ? (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(38,90%,93%)", color: "hsl(38,80%,32%)" }}
              >
                🏆 Спортивная
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(0,0%,93%)", color: "hsl(0,0%,42%)" }}
              >
                🥇 Основная
              </span>
            )}

            {/* Документы */}
            {!s.cert && (
              <span className="badge-absent">Нет справки</span>
            )}
            {s.cert && !certOk && (
              <span className="badge-absent">Справка просрочена</span>
            )}
            {s.insurance && !insOk && (
              <span className="badge-absent">Страховка !</span>
            )}
            {s.annual_fee_number && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(0,0%,93%)", color: "hsl(0,0%,42%)" }}
              >
                № {s.annual_fee_number as string}
              </span>
            )}
          </div>
        </div>

        {/* Кнопки редакт + меню */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 -mr-0.5">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center text-gray-350 hover:text-blue-500 transition-colors"
          >
            <Icon name="Pencil" size={15} />
          </button>
          <button
            onClick={onArchive}
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
          >
            <Icon name="MoreVertical" size={15} />
          </button>
        </div>
      </div>

      {/* Нижняя строка кнопок — точь-в-точь по макету */}
      <div className="flex border-t border-gray-100 relative z-10" style={{ minHeight: 44 }}>

        {/* Справка */}
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
        >
          <Icon name="FileText" size={13} />
          Справка
        </button>

        {/* Оплата */}
        <button
          disabled={togglingPay || paid}
          onClick={paid ? undefined : onMarkPay}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-r border-gray-100"
          style={{ color: paid ? "hsl(142,55%,35%)" : "hsl(0,0%,45%)" }}
        >
          {paid ? (
            <><Icon name="CircleDollarSign" size={13} />Оплата</>
          ) : togglingPay ? (
            <><Icon name="Loader" size={13} />...</>
          ) : (
            <><Icon name="CircleDollarSign" size={13} />Оплата</>
          )}
        </button>

        {/* Отметить посещение / Посещён */}
        {canEdit && (
          attended ? (
            <div
              className="flex-[1.6] flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold"
              style={{ background: "hsl(142,50%,93%)", color: "hsl(142,55%,30%)" }}
            >
              <Icon name="Check" size={13} />
              Посещение ✓
            </div>
          ) : (
            <button
              disabled={togglingMain}
              onClick={onMarkMain}
              className="flex-[1.6] flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-white active:opacity-80 disabled:opacity-60 transition-all"
              style={{ background: "hsl(0,72%,40%)" }}
            >
              {togglingMain ? (
                <><Icon name="Loader" size={13} />...</>
              ) : (
                <><Icon name="Check" size={13} />Отметить посещение</>
              )}
            </button>
          )
        )}

        {/* Спорт-группа (доп. кнопка) */}
        {s.has_sport && canEdit && (
          <button
            disabled={togglingSport}
            onClick={isPresentSport ? undefined : onMarkSport}
            className="px-2.5 py-2.5 text-[11px] font-bold transition-all border-l border-gray-100 flex items-center gap-1"
            style={{
              color: isPresentSport ? "hsl(200,70%,35%)" : "hsl(200,70%,45%)",
              background: isPresentSport ? "hsl(200,55%,93%)" : "transparent",
            }}
          >
            {togglingSport ? "..." : isPresentSport ? "✅" : "Спорт"}
          </button>
        )}
      </div>
    </div>
  );
}