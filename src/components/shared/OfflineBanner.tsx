import Icon from "@/components/ui/icon";
import { useOnlineSync } from "@/lib/useOnlineSync";

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing, flushQueue } = useOnlineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-semibold ${isOnline ? "bg-amber-50 text-amber-700 border-b border-amber-200" : "bg-gray-100 text-gray-600 border-b border-gray-200"}`}>
      <div className="flex items-center gap-2">
        <Icon name={isOnline ? "Wifi" : "WifiOff"} size={14} />
        {isOnline
          ? syncing
            ? `Синхронизация... (${pendingCount})`
            : `Есть несинхронизированные данные: ${pendingCount}`
          : "Офлайн — изменения сохраняются на устройстве"}
      </div>
      {isOnline && !syncing && pendingCount > 0 && (
        <button onClick={flushQueue} className="underline underline-offset-2 hover:opacity-70">
          Синхронизировать
        </button>
      )}
    </div>
  );
}
