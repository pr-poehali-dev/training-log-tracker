import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queueGetAll, queueDelete, queueCount } from "./offlineDb";

export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const refreshCount = useCallback(async () => {
    const n = await queueCount();
    setPendingCount(n);
  }, []);

  const flushQueue = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const items = await queueGetAll();
      const invalidated = new Set<string>();
      for (const item of items) {
        try {
          await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
          await queueDelete(item.id!);
          invalidated.add(item.queryKey);
        } catch {
          // если запрос упал — оставляем в очереди
        }
      }
      // инвалидируем только успешно синкнутые ключи
      for (const key of invalidated) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [syncing, qc, refreshCount]);

  useEffect(() => {
    refreshCount();

    const onOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flushQueue, refreshCount]);

  return { isOnline, pendingCount, syncing, flushQueue };
}
