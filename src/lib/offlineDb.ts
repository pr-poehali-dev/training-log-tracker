// IndexedDB wrapper для офлайн-кэша и очереди мутаций

const DB_NAME = "iko_offline";
const DB_VERSION = 1;

type StoreName = "cache" | "sync_queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("sync_queue")) {
        db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── CACHE ─────────────────────────────────────────────────────

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache" as StoreName, "readwrite");
    tx.objectStore("cache").put({ key, value, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cache" as StoreName, "readonly");
    const req = tx.objectStore("cache").get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── SYNC QUEUE ────────────────────────────────────────────────

export interface SyncItem {
  id?: number;
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
  ts: number;
  queryKey: string; // для инвалидации после синка
}

export async function queuePush(item: Omit<SyncItem, "id" | "ts">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue" as StoreName, "readwrite");
    tx.objectStore("sync_queue").add({ ...item, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueGetAll(): Promise<SyncItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue" as StoreName, "readonly");
    const req = tx.objectStore("sync_queue").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueDelete(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue" as StoreName, "readwrite");
    tx.objectStore("sync_queue").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue" as StoreName, "readonly");
    const req = tx.objectStore("sync_queue").count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
