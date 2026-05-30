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

export function StudentCard({
  s, paid, isPresentMain, isPresentSport,
  togglingPay, togglingMain, togglingSport,
  canEdit, certOk, insOk, birthday, newStudent,
  onEdit, onArchive, onMarkPay, onMarkMain, onMarkSport,
}: StudentCardProps) {
  const attended = isPresentMain || isPresentSport;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative"
      style={birthday ? { background: "linear-gradient(135deg, #fffbeb 0%, #fff 60%)" } : undefined}>

      {/* Иероглиф-водяной знак */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.04] font-bold"
        style={{ fontSize: 64, lineHeight: 1, fontFamily: "serif", color: "#000", zIndex: 0 }}>
        武
      </div>

      <div className="p-3 flex items-start gap-3 relative z-10">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-oswald font-bold flex-shrink-0 ${birthday ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>
          {birthday ? "🎂" : ini(s.name as string)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{s.name as string}</span>
            {newStudent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: "hsl(265,60%,55%)" }}>NEW</span>
            )}
            {birthday && <span className="text-[10px]">🎉</span>}
          </div>

          {/* Hall · Group */}
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
            {[s.hall, s.hall2].filter(Boolean).join(" · ")}
            {(s.grp || s.lvl) ? ` · ${[s.grp, s.lvl].filter(Boolean).join(" ")}` : ""}
          </div>

          {/* Schedule */}
          {s.schedule && (
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Icon name="Clock" size={10} />
              {s.schedule as string}
            </div>
          )}

          {/* Start date */}
          {s.created_at && (
            <div className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5">
              <Icon name="CalendarPlus" size={10} />
              с {new Date(s.created_at as string).toLocaleDateString("ru")}
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {s.has_sport && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(38,90%,94%)", color: "hsl(38,85%,35%)", border: "1px solid hsl(38,85%,80%)" }}>
                🏆 Спортивная
              </span>
            )}
            {!s.has_sport && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(0,0%,94%)", color: "hsl(0,0%,45%)", border: "1px solid hsl(0,0%,82%)" }}>
                🥇 Основная
              </span>
            )}
            {s.cert
              ? (certOk ? null : <span className="badge-absent">Справка !</span>)
              : <span className="badge-absent">Нет справки</span>}
            {s.insurance && !insOk && <span className="badge-absent">Страховка !</span>}
            {s.annual_fee_number && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(0,0%,94%)", color: "hsl(0,0%,45%)", border: "1px solid hsl(0,0%,82%)" }}>
                № {s.annual_fee_number as string}
              </span>
            )}
          </div>
        </div>

        {/* Edit + menu buttons */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
            <Icon name="Pencil" size={15} />
          </button>
          <button onClick={onArchive} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
            <Icon name="MoreVertical" size={15} />
          </button>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex border-t border-gray-100 relative z-10">
        {/* Справка */}
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100">
          <Icon name="FileText" size={13} />
          Справка
        </button>

        {/* Оплата */}
        <button
          disabled={togglingPay || paid}
          onClick={paid ? undefined : onMarkPay}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r border-gray-100"
          style={{ color: paid ? "hsl(142,60%,38%)" : "hsl(0,0%,45%)" }}>
          {paid
            ? <><Icon name="CheckCircle" size={13} />Оплачено</>
            : togglingPay
              ? <><Icon name="Loader" size={13} />...</>
              : <><Icon name="CircleDollarSign" size={13} />Оплата</>}
        </button>

        {/* Отметить посещение */}
        {canEdit && (
          attended ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
              style={{ background: "hsl(142,55%,94%)", color: "hsl(142,60%,30%)" }}>
              <Icon name="Check" size={14} />
              Посещение ✓
            </div>
          ) : (
            <button
              disabled={togglingMain}
              onClick={onMarkMain}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white transition-all active:opacity-80 disabled:opacity-60"
              style={{ background: "hsl(0,72%,40%)" }}>
              {togglingMain
                ? <><Icon name="Loader" size={13} />...</>
                : <><Icon name="Check" size={14} />Отметить посещение</>}
            </button>
          )
        )}

        {/* Спорт группа */}
        {s.has_sport && canEdit && (
          <button
            disabled={togglingSport}
            onClick={isPresentSport ? undefined : onMarkSport}
            className="px-3 py-2.5 text-xs font-bold transition-all border-l border-gray-100"
            style={{
              color: isPresentSport ? "hsl(200,70%,38%)" : "hsl(200,70%,45%)",
              background: isPresentSport ? "hsl(200,60%,94%)" : "transparent"
            }}>
            {togglingSport ? "..." : isPresentSport ? "✅" : "Спорт"}
          </button>
        )}
      </div>
    </div>
  );
}
