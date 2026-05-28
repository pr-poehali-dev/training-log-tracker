import { offlineGet, offlineMutate } from "./offlineApi";

const URLS = {
  auth:          "https://functions.poehali.dev/d83b508f-5f51-4ba2-b5e0-df30b382e5e0",
  journal:       "https://functions.poehali.dev/34ed4bb5-c29f-4428-a47f-7e00a87d4b8b",
  reports:       "https://functions.poehali.dev/6c56dc4f-118e-4da5-83c3-bb24163222d5",
  students:      "https://functions.poehali.dev/dc890787-2476-4a3d-964e-94efd4210b0f",
  notifications: "https://functions.poehali.dev/8bafc972-b60d-47d5-af19-dd9811d522ae",
  push:          "https://functions.poehali.dev/22d93ed7-ba75-44de-9235-cb0d4aa13729",
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("iko_user") || "null"); } catch { return null; }
}

function headers(extra?: Record<string, string>) {
  const user = getUser();
  return {
    "Content-Type": "application/json",
    ...(user?.id ? { "X-User-Id": String(user.id) } : {}),
    ...extra,
  };
}

async function req(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...headers(), ...(opts?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

// ── AUTH (всегда онлайн) ───────────────────────────────────────
export const authApi = {
  login:   (body: { username: string; password: string }) =>
    req(`${URLS.auth}?action=login`, { method: "POST", body: JSON.stringify(body) }),

  register: (body: { username: string; password: string; full_name: string; hall?: string }) =>
    req(`${URLS.auth}?action=register`, { method: "POST", body: JSON.stringify(body) }),

  trainers: () =>
    req(`${URLS.auth}?action=trainers`),

  deleteTrainer: (id: number) =>
    req(`${URLS.auth}?action=delete_trainer&id=${id}`, { method: "DELETE" }),

  togglePermission: (id: number) =>
    req(`${URLS.auth}?action=toggle_permission&id=${id}`, { method: "POST" }),

  updateTrainer: (id: number, body: { full_name: string; hall?: string; schedule?: string; trainings_per_month?: number; password?: string }) =>
    req(`${URLS.auth}?action=update_trainer&id=${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ── STUDENTS ──────────────────────────────────────────────────
export const studentsApi = {
  list: (trainerId?: number) => {
    const url = `${URLS.students}${trainerId ? `?trainer_id=${trainerId}` : ""}`;
    const key = `students_${trainerId ?? "me"}`;
    return offlineGet(url, key);
  },

  create: (body: Record<string, unknown>) =>
    offlineMutate(URLS.students, "POST", body, "students"),

  update: (id: number, body: Record<string, unknown>) =>
    offlineMutate(`${URLS.students}?id=${id}`, "PUT", body, "students"),

  remove: (id: number, reason: string) =>
    offlineMutate(`${URLS.students}?id=${id}`, "DELETE", { reason }, "students"),

  listArchived: (trainerId?: number) => {
    const url = `${URLS.students}?archived=1${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `students_archived_${trainerId ?? "me"}`);
  },
};

// ── ATTENDANCE ────────────────────────────────────────────────
export const attendanceApi = {
  byDate: (date: string, trainerId?: number) => {
    const url = `${URLS.journal}?section=attendance&date=${date}${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `att_date_${date}_${trainerId ?? "me"}`);
  },

  byMonth: (month: string, trainerId?: number) => {
    const url = `${URLS.journal}?section=attendance&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `att_month_${month}_${trainerId ?? "me"}`);
  },

  mark: (body: { student_id: number; date: string; present: boolean }) => {
    const month = body.date.slice(0, 7);
    const patchFn = (cached: unknown) => {
      const arr = (cached as Record<string, unknown>[]) || [];
      const exists = arr.find(a => a.student_id === body.student_id && a.date === body.date);
      if (exists) return arr.map(a => a.student_id === body.student_id && a.date === body.date ? { ...a, present: body.present } : a);
      return [...arr, { student_id: body.student_id, date: body.date, present: body.present }];
    };
    return offlineMutate(
      `${URLS.journal}?section=attendance`,
      "POST",
      body,
      `att_date_${body.date}_me`,
      patchFn,
      [{ key: `att_month_${month}_me`, fn: patchFn }],
    );
  },
};

// ── PAYMENTS ──────────────────────────────────────────────────
export const paymentsApi = {
  byMonth: (month: string, trainerId?: number) => {
    const url = `${URLS.journal}?section=payments&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `pay_month_${month}_${trainerId ?? "me"}`);
  },

  mark: (body: { student_id: number; month: string; paid: boolean }) => {
    const patchFn = (cached: unknown) => {
      const arr = (cached as Record<string, unknown>[]) || [];
      return arr.map(p => p.student_id === body.student_id ? { ...p, paid: body.paid } : p);
    };
    return offlineMutate(
      `${URLS.journal}?section=payments`,
      "POST",
      body,
      `pay_month_${body.month}_me`,
      patchFn,
    );
  },
};

// ── PERSONAL SESSIONS ─────────────────────────────────────────
export const personalApi = {
  byMonth: (month: string, trainerId?: number) => {
    const url = `${URLS.journal}?section=personal&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `personal_${month}_${trainerId ?? "me"}`);
  },

  create: (body: Record<string, unknown>) =>
    offlineMutate(`${URLS.journal}?section=personal`, "POST", body, "personal"),

  update: (id: number, body: Record<string, unknown>) =>
    offlineMutate(`${URLS.journal}?section=personal&id=${id}`, "PUT", body, "personal"),

  remove: (id: number) =>
    offlineMutate(`${URLS.journal}?section=personal&id=${id}`, "DELETE", undefined, "personal"),
};

// ── NOTES ─────────────────────────────────────────────────────
export const notesApi = {
  list: () =>
    offlineGet(`${URLS.journal}?section=notes`, "notes_me"),

  create: (body: Record<string, unknown>) =>
    offlineMutate(`${URLS.journal}?section=notes`, "POST", body, "notes"),

  update: (id: number, body: Record<string, unknown>) =>
    offlineMutate(`${URLS.journal}?section=notes&id=${id}`, "PUT", body, "notes"),

  remove: (id: number) =>
    offlineMutate(`${URLS.journal}?section=notes&id=${id}`, "DELETE", undefined, "notes"),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────
export const notificationsApi = {
  list: () => req(URLS.notifications),
  markRead: (id?: number) => req(`${URLS.notifications}?action=mark_read`, { method: "POST", body: JSON.stringify(id ? { id } : {}) }),
  notifyJournalFilled: (date: string) => req(`${URLS.journal}?section=notify`, { method: "POST", body: JSON.stringify({ action: "journal_filled", date }) }),
};

// ── PUSH ──────────────────────────────────────────────────────
export const pushApi = {
  getVapidKey: (): Promise<{ vapid_public: string }> => req(`${URLS.push}?action=vapid_public`),
  subscribe: (subscription: PushSubscriptionJSON) =>
    req(`${URLS.push}?action=subscribe`, { method: "POST", body: JSON.stringify({ subscription }) }),
  unsubscribe: (endpoint: string) =>
    req(`${URLS.push}?action=unsubscribe`, { method: "POST", body: JSON.stringify({ endpoint }) }),
  test: () => req(`${URLS.push}?action=test`, { method: "POST", body: "{}" }),
};

// ── REPORTS ───────────────────────────────────────────────────
export const reportsApi = {
  get: (month: string, trainerId?: number) => {
    const url = `${URLS.reports}?month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`;
    return offlineGet(url, `reports_${month}_${trainerId ?? "me"}`);
  },
};