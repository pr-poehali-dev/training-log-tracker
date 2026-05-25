// Офлайн-обёртка: при сети — обычный fetch + кэш. При офлайне — кэш + очередь.

import { cacheSet, cacheGet, queuePush } from "./offlineDb";

function getUser() {
  try { return JSON.parse(localStorage.getItem("iko_user") || "null"); } catch { return null; }
}

function makeHeaders(): Record<string, string> {
  const user = getUser();
  return {
    "Content-Type": "application/json",
    ...(user?.id ? { "X-User-Id": String(user.id) } : {}),
  };
}

// GET с кэшированием
export async function offlineGet<T>(url: string, cacheKey: string): Promise<T> {
  if (navigator.onLine) {
    try {
      const res = await fetch(url, { headers: makeHeaders() });
      const data = await res.json();
      if (res.ok) {
        await cacheSet(cacheKey, data);
        return data as T;
      }
      throw new Error(data.error || "Ошибка сервера");
    } catch (e) {
      // если упало — пробуем кэш
      const cached = await cacheGet<T>(cacheKey);
      if (cached !== null) return cached;
      throw e;
    }
  } else {
    const cached = await cacheGet<T>(cacheKey);
    if (cached !== null) return cached;
    throw new Error("Нет соединения и нет кэша");
  }
}

// POST/PUT/DELETE: онлайн — сразу, офлайн — в очередь + оптимистичный кэш
export async function offlineMutate(
  url: string,
  method: string,
  body: unknown,
  queryKey: string,
  optimisticFn?: (cached: unknown) => unknown,
): Promise<void> {
  const headers = makeHeaders();
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

  if (navigator.onLine) {
    const res = await fetch(url, { method, headers, body: bodyStr });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  } else {
    // Оптимистично обновляем кэш
    if (optimisticFn) {
      const cached = await cacheGet(queryKey);
      if (cached !== null) {
        await cacheSet(queryKey, optimisticFn(cached));
      }
    }
    // Кладём в очередь
    await queuePush({ url, method, body: bodyStr, headers, queryKey });
  }
}
