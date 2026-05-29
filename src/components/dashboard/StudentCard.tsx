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
  return (
    <div
      className={`card-glass rounded-2xl overflow-hidden border-l-2 ${birthday ? "border-l-yellow-400" : paid ? "border-l-green-500" : "border-l-red-400"}`}
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
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-500 transition-colors">
            <Icon name="Pencil" size={14} />
          </button>
          <button onClick={onArchive} className="text-gray-300 hover:text-red-400 transition-colors">
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
              ? <button disabled={togglingPay} onClick={onMarkPay} className="text-xs font-semibold" style={{ color: "hsl(28,85%,42%)" }}>{togglingPay ? "..." : "💰 Оплатить"}</button>
              : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div className="w-px bg-gray-100" />
        {/* Основная группа */}
        <div className="flex-1 py-2 text-center">
          {isPresentMain
            ? <span className="text-xs font-semibold" style={{ color: "hsl(142,60%,38%)" }}>✅ Осн.</span>
            : canEdit
              ? <button
                  disabled={togglingMain}
                  onClick={onMarkMain}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "hsl(0,72%,40%)" }}>
                  {togglingMain ? "..." : "● Осн."}
                </button>
              : <span className="text-xs text-gray-300">—</span>}
        </div>
        {/* Спортивная группа — только если has_sport */}
        {s.has_sport && (
          <>
            <div className="w-px bg-gray-100" />
            <div className="flex-1 py-2 text-center">
              {isPresentSport
                ? <span className="text-xs font-semibold" style={{ color: "hsl(200,70%,38%)" }}>✅ Спорт</span>
                : canEdit
                  ? <button
                      disabled={togglingSport}
                      onClick={onMarkSport}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: "hsl(200,70%,45%)" }}>
                      {togglingSport ? "..." : "● Спорт"}
                    </button>
                  : <span className="text-xs text-gray-300">—</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
