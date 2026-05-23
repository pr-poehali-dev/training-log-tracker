import { useState, useCallback } from "react";
import type { Student, Attendance, Payment, PersonalSession, Note } from "@/types";

const KEYS = { s: "iko13_s", a: "iko13_a", p: "iko13_p", pt: "iko13_pt", n: "iko13_n" };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const tod = () => new Date().toISOString().slice(0, 10);

function getDemoStudents(): Student[] {
  const ny = new Date(); ny.setFullYear(ny.getFullYear() + 1);
  const nys = ny.toISOString().slice(0, 10);
  return [
    { id: "s1", name: "Иван Петров", hall: "Основной зал", grp: "Группа А", phone: "+7 999 123-45-67", iko: "IKO-2024-001", fee: 3000, lvl: "5 кю", cert: true, ci: "2024-01-15", ce: nys },
    { id: "s2", name: "Мария Иванова", hall: "Основной зал", grp: "Группа А", phone: "+7 999 234-56-78", iko: "IKO-2024-002", fee: 3000, lvl: "8 кю", cert: true, ci: "2023-12-10", ce: "2024-12-10" },
    { id: "s3", name: "Алексей Сидоров", hall: "Малый зал", grp: "Группа Б", phone: "+7 999 345-67-89", iko: "IKO-2024-003", fee: 3500, lvl: "3 кю", cert: false, ci: "", ce: "" },
    { id: "s4", name: "Екатерина Смирнова", hall: "Основной зал", grp: "Группа А", phone: "+7 999 456-78-90", iko: "IKO-2024-004", fee: 3000, lvl: "6 кю", cert: true, ci: "2023-10-01", ce: "2024-10-01" },
    { id: "s5", name: "Дмитрий Козлов", hall: "Малый зал", grp: "Группа Б", phone: "+7 999 567-89-01", iko: "IKO-2024-005", fee: 3500, lvl: "2 кю", cert: true, ci: "2022-05-20", ce: "2023-05-20" },
  ];
}

function getDemoNotes(): Note[] {
  return [
    { id: "n1", ttl: "План тренировки", bod: "Отработка ударов ногами, работа в парах, спарринги", date: tod(), tags: "план,тренировка", imp: false },
    { id: "n2", ttl: "Идея: соревнования", bod: "Организовать внутренние соревнования в декабре", date: tod(), tags: "идея", imp: true },
  ];
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; }
}

export function useStore() {
  const [students, setStudentsState] = useState<Student[]>(() => loadFromStorage(KEYS.s, getDemoStudents()));
  const [attendance, setAttendanceState] = useState<Attendance[]>(() => loadFromStorage(KEYS.a, []));
  const [payments, setPaymentsState] = useState<Payment[]>(() => loadFromStorage(KEYS.p, []));
  const [personal, setPersonalState] = useState<PersonalSession[]>(() => loadFromStorage(KEYS.pt, []));
  const [notes, setNotesState] = useState<Note[]>(() => loadFromStorage(KEYS.n, getDemoNotes()));

  const persist = useCallback((key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, []);

  const setStudents = useCallback((v: Student[] | ((p: Student[]) => Student[])) => {
    setStudentsState(prev => { const next = typeof v === "function" ? v(prev) : v; persist(KEYS.s, next); return next; });
  }, [persist]);

  const setAttendance = useCallback((v: Attendance[] | ((p: Attendance[]) => Attendance[])) => {
    setAttendanceState(prev => { const next = typeof v === "function" ? v(prev) : v; persist(KEYS.a, next); return next; });
  }, [persist]);

  const setPayments = useCallback((v: Payment[] | ((p: Payment[]) => Payment[])) => {
    setPaymentsState(prev => { const next = typeof v === "function" ? v(prev) : v; persist(KEYS.p, next); return next; });
  }, [persist]);

  const setPersonal = useCallback((v: PersonalSession[] | ((p: PersonalSession[]) => PersonalSession[])) => {
    setPersonalState(prev => { const next = typeof v === "function" ? v(prev) : v; persist(KEYS.pt, next); return next; });
  }, [persist]);

  const setNotes = useCallback((v: Note[] | ((p: Note[]) => Note[])) => {
    setNotesState(prev => { const next = typeof v === "function" ? v(prev) : v; persist(KEYS.n, next); return next; });
  }, [persist]);

  const today = tod();
  const currentMon = today.slice(0, 7);

  const halls = [...new Set(students.map(s => s.hall).filter(Boolean))];
  const groups = [...new Set(students.map(s => s.grp).filter(Boolean))];

  const isPresent = (sid: string, date: string) => attendance.some(a => a.sid === sid && a.date === date && a.present);
  const isPaid = (sid: string, mon: string) => payments.some(p => p.sid === sid && p.mon === mon && p.paid);
  const isCertValid = (s: Student) => !!(s.cert && s.ce && s.ce >= today);

  const toggleAttendance = (sid: string, date: string, present: boolean) => {
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.sid === sid && a.date === date));
      return [...filtered, { sid, date, present }];
    });
  };

  const togglePayment = (sid: string, mon: string, paid: boolean) => {
    setPayments(prev => {
      const filtered = prev.filter(p => !(p.sid === sid && p.mon === mon));
      if (paid) return [...filtered, { sid, mon, paid: true }];
      return filtered;
    });
  };

  const addStudent = (data: Omit<Student, "id">) => setStudents(prev => [...prev, { id: uid(), ...data }]);
  const updateStudent = (id: string, data: Partial<Student>) => setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setAttendance(prev => prev.filter(a => a.sid !== id));
    setPayments(prev => prev.filter(p => p.sid !== id));
    setPersonal(prev => prev.filter(p => p.sid !== id));
  };

  const addPersonal = (data: Omit<PersonalSession, "id">) => setPersonal(prev => [...prev, { id: uid(), ...data }]);
  const updatePersonal = (id: string, data: Partial<PersonalSession>) => setPersonal(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  const deletePersonal = (id: string) => setPersonal(prev => prev.filter(p => p.id !== id));

  const addNote = (data: Omit<Note, "id">) => setNotes(prev => [...prev, { id: uid(), ...data }]);
  const updateNote = (id: string, data: Partial<Note>) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const reset = () => {
    const ds = getDemoStudents();
    const dn = getDemoNotes();
    setStudents(ds);
    setAttendance([]);
    setPayments([]);
    setPersonal([]);
    setNotes(dn);
  };

  return {
    students, attendance, payments, personal, notes,
    halls, groups, today, currentMon,
    isPresent, isPaid, isCertValid,
    toggleAttendance, togglePayment,
    addStudent, updateStudent, deleteStudent,
    addPersonal, updatePersonal, deletePersonal,
    addNote, updateNote, deleteNote,
    reset,
  };
}

export type Store = ReturnType<typeof useStore>;
