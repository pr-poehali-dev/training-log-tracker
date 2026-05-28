import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(dateStr).toLocaleDateString("ru");
}

export default function NotificationBell({ user, date }: { user: AppUser; date: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 60000,
  });

  const unread: number = (data as { unread?: number })?.unread ?? 0;
  const notifications: Record<string, unknown>[] = (data as { notifications?: Record<string, unknown>[] })?.notifications ?? [];

  const markAll = async () => {
    await notificationsApi.markRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markOne = async (id: number) => {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const sendJournalFilled = async () => {
    setSending(true);
    try {
      await notificationsApi.notifyJournalFilled(date);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } finally { setSending(false); }
  };

  const iconColor = unread > 0 ? "hsl(0,72%,40%)" : "#9ca3af";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
        <Icon name="Bell" size={15} style={{ color: iconColor }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "hsl(0,72%,40%)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-700">Уведомления</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                  Прочитать все
                </button>
              )}
            </div>

            {/* Кнопка для тренера — отправить уведомление о заполнении журнала */}
            {user.role === "trainer" && (
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Сообщить администратору:</p>
                <button
                  onClick={sendJournalFilled}
                  disabled={sending || sent}
                  className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: sent ? "hsl(142,60%,40%)" : "hsl(0,72%,40%)", color: "#fff" }}>
                  <Icon name={sent ? "CheckCircle" : "Send"} size={13} />
                  {sent ? "Отправлено!" : sending ? "Отправка..." : `Журнал заполнен (${date})`}
                </button>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  <Icon name="BellOff" size={24} className="mx-auto mb-2 opacity-30" />
                  Нет уведомлений
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id as number}
                    onClick={() => !n.read && markOne(n.id as number)}
                    className={`px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-red-50/40" : ""}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-red-500" : "bg-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${n.type === "archive" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                            {n.type === "archive" ? "Архив" : "Журнал"}
                          </span>
                          <span className="text-[10px] text-gray-300">{timeAgo(n.created_at as string)}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{n.message as string}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
