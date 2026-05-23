const URLS = {
  auth:     "https://functions.poehali.dev/d83b508f-5f51-4ba2-b5e0-df30b382e5e0",
  journal:  "https://functions.poehali.dev/34ed4bb5-c29f-4428-a47f-7e00a87d4b8b",
  reports:  "https://functions.poehali.dev/6c56dc4f-118e-4da5-83c3-bb24163222d5",
  students: "https://functions.poehali.dev/dc890787-2476-4a3d-964e-94efd4210b0f",
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

// ── AUTH ──────────────────────────────────────────────────────
export const authApi = {
  login:   (body: { username: string; password: string }) =>
    req(`${URLS.auth}?action=login`, { method: "POST", body: JSON.stringify(body) }),

  register: (body: { username: string; password: string; full_name: string; hall?: string }) =>
    req(`${URLS.auth}?action=register`, { method: "POST", body: JSON.stringify(body) }),

  trainers: () =>
    req(`${URLS.auth}?action=trainers`),

  deleteTrainer: (id: number) =>
    req(`${URLS.auth}?action=delete_trainer&id=${id}`, { method: "DELETE" }),
};

// ── STUDENTS ──────────────────────────────────────────────────
export const studentsApi = {
  list: (trainerId?: number) =>
    req(`${URLS.students}${trainerId ? `?trainer_id=${trainerId}` : ""}`),

  create: (body: Record<string, unknown>) =>
    req(URLS.students, { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Record<string, unknown>) =>
    req(`${URLS.students}?id=${id}`, { method: "PUT", body: JSON.stringify(body) }),

  remove: (id: number) =>
    req(`${URLS.students}?id=${id}`, { method: "DELETE" }),
};

// ── ATTENDANCE ────────────────────────────────────────────────
export const attendanceApi = {
  byDate:  (date: string, trainerId?: number) =>
    req(`${URLS.journal}?section=attendance&date=${date}${trainerId ? `&trainer_id=${trainerId}` : ""}`),

  byMonth: (month: string, trainerId?: number) =>
    req(`${URLS.journal}?section=attendance&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`),

  mark: (body: { student_id: number; date: string; present: boolean }) =>
    req(`${URLS.journal}?section=attendance`, { method: "POST", body: JSON.stringify(body) }),
};

// ── PAYMENTS ──────────────────────────────────────────────────
export const paymentsApi = {
  byMonth: (month: string, trainerId?: number) =>
    req(`${URLS.journal}?section=payments&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`),

  mark: (body: { student_id: number; month: string; paid: boolean }) =>
    req(`${URLS.journal}?section=payments`, { method: "POST", body: JSON.stringify(body) }),
};

// ── PERSONAL SESSIONS ─────────────────────────────────────────
export const personalApi = {
  byMonth: (month: string, trainerId?: number) =>
    req(`${URLS.journal}?section=personal&month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`),

  create: (body: Record<string, unknown>) =>
    req(`${URLS.journal}?section=personal`, { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Record<string, unknown>) =>
    req(`${URLS.journal}?section=personal&id=${id}`, { method: "PUT", body: JSON.stringify(body) }),

  remove: (id: number) =>
    req(`${URLS.journal}?section=personal&id=${id}`, { method: "DELETE" }),
};

// ── NOTES ─────────────────────────────────────────────────────
export const notesApi = {
  list: () =>
    req(`${URLS.journal}?section=notes`),

  create: (body: Record<string, unknown>) =>
    req(`${URLS.journal}?section=notes`, { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Record<string, unknown>) =>
    req(`${URLS.journal}?section=notes&id=${id}`, { method: "PUT", body: JSON.stringify(body) }),

  remove: (id: number) =>
    req(`${URLS.journal}?section=notes&id=${id}`, { method: "DELETE" }),
};

// ── REPORTS ───────────────────────────────────────────────────
export const reportsApi = {
  get: (month: string, trainerId?: number) =>
    req(`${URLS.reports}?month=${month}${trainerId ? `&trainer_id=${trainerId}` : ""}`),
};
