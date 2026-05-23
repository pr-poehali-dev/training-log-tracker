export const students = [
  { id: 1, name: "Арсений Ковалёв", age: 14, phone: "+7 905 123-45-67", parent: "Ковалёва М.В.", group: "Юниоры A", joinDate: "2024-09-01", avatar: "АК", balance: 2500, totalVisits: 42, lastVisit: "2025-05-21" },
  { id: 2, name: "Полина Захарова", age: 12, phone: "+7 916 234-56-78", parent: "Захаров И.П.", group: "Начинающие", joinDate: "2024-10-15", avatar: "ПЗ", balance: -500, totalVisits: 28, lastVisit: "2025-05-20" },
  { id: 3, name: "Максим Тарасов", age: 16, phone: "+7 926 345-67-89", parent: "Тарасова Е.А.", group: "Юниоры B", joinDate: "2024-08-20", avatar: "МТ", balance: 5000, totalVisits: 58, lastVisit: "2025-05-22" },
  { id: 4, name: "Виктория Лебедева", age: 13, phone: "+7 937 456-78-90", parent: "Лебедев С.Н.", group: "Юниоры A", joinDate: "2024-11-01", avatar: "ВЛ", balance: 0, totalVisits: 19, lastVisit: "2025-05-19" },
  { id: 5, name: "Кирилл Морозов", age: 15, phone: "+7 948 567-89-01", parent: "Морозова О.В.", group: "Продвинутые", joinDate: "2024-07-10", avatar: "КМ", balance: 3000, totalVisits: 71, lastVisit: "2025-05-22" },
  { id: 6, name: "Алина Соколова", age: 11, phone: "+7 959 678-90-12", parent: "Соколов Д.Р.", group: "Начинающие", joinDate: "2025-01-15", avatar: "АС", balance: 1500, totalVisits: 15, lastVisit: "2025-05-21" },
  { id: 7, name: "Данила Попов", age: 17, phone: "+7 960 789-01-23", parent: "Попова Т.И.", group: "Продвинутые", joinDate: "2024-06-01", avatar: "ДП", balance: -1000, totalVisits: 89, lastVisit: "2025-05-18" },
  { id: 8, name: "Анастасия Волкова", age: 14, phone: "+7 971 890-12-34", parent: "Волков А.Г.", group: "Юниоры B", joinDate: "2024-09-25", avatar: "АВ", balance: 2000, totalVisits: 35, lastVisit: "2025-05-22" },
];

export const groups = ["Все группы", "Начинающие", "Юниоры A", "Юниоры B", "Продвинутые"];

export const schedule = [
  { id: 1, day: "Понедельник", time: "16:00", duration: 90, group: "Начинающие", trainer: "Козлов А.В.", room: "Зал 1" },
  { id: 2, day: "Понедельник", time: "18:00", duration: 90, group: "Юниоры A", trainer: "Козлов А.В.", room: "Зал 1" },
  { id: 3, day: "Вторник", time: "17:00", duration: 90, group: "Юниоры B", trainer: "Петров С.М.", room: "Зал 2" },
  { id: 4, day: "Среда", time: "16:00", duration: 90, group: "Начинающие", trainer: "Козлов А.В.", room: "Зал 1" },
  { id: 5, day: "Среда", time: "18:30", duration: 90, group: "Продвинутые", trainer: "Петров С.М.", room: "Зал 2" },
  { id: 6, day: "Четверг", time: "17:00", duration: 90, group: "Юниоры A", trainer: "Козлов А.В.", room: "Зал 1" },
  { id: 7, day: "Пятница", time: "16:00", duration: 90, group: "Юниоры B", trainer: "Петров С.М.", room: "Зал 2" },
  { id: 8, day: "Пятница", time: "18:00", duration: 90, group: "Продвинутые", trainer: "Козлов А.В.", room: "Зал 1" },
  { id: 9, day: "Суббота", time: "10:00", duration: 120, group: "Все группы", trainer: "Козлов А.В.", room: "Большой зал" },
];

export const attendance = [
  { date: "2025-05-22", trainingId: 2, studentId: 1, present: true },
  { date: "2025-05-22", trainingId: 2, studentId: 3, present: true },
  { date: "2025-05-22", trainingId: 2, studentId: 5, present: true },
  { date: "2025-05-22", trainingId: 2, studentId: 8, present: false },
  { date: "2025-05-21", trainingId: 1, studentId: 2, present: true },
  { date: "2025-05-21", trainingId: 1, studentId: 6, present: true },
  { date: "2025-05-21", trainingId: 1, studentId: 4, present: false },
  { date: "2025-05-20", trainingId: 3, studentId: 2, present: true },
  { date: "2025-05-20", trainingId: 3, studentId: 8, present: true },
  { date: "2025-05-19", trainingId: 4, studentId: 4, present: false },
];

export const journalDates = ["2025-05-22", "2025-05-21", "2025-05-20", "2025-05-19", "2025-05-17"];

export const journalData: Record<string, Record<number, boolean>> = {
  "2025-05-22": { 1: true, 3: true, 4: false, 5: true, 8: true },
  "2025-05-21": { 1: true, 2: true, 4: true, 6: true, 7: false },
  "2025-05-20": { 2: true, 3: false, 5: true, 7: true, 8: true },
  "2025-05-19": { 1: true, 4: false, 6: true, 7: true },
  "2025-05-17": { 1: true, 2: true, 3: true, 5: true, 7: true, 8: false },
};

export const payments = [
  { id: 1, studentId: 1, studentName: "Арсений Ковалёв", amount: 3000, date: "2025-05-15", type: "Абонемент (8 занятий)", status: "paid", method: "Карта" },
  { id: 2, studentId: 2, studentName: "Полина Захарова", amount: 3000, date: "2025-05-10", type: "Абонемент (8 занятий)", status: "overdue", method: "" },
  { id: 3, studentId: 3, studentName: "Максим Тарасов", amount: 5000, date: "2025-05-20", type: "Абонемент (16 занятий)", status: "paid", method: "Наличные" },
  { id: 4, studentId: 4, studentName: "Виктория Лебедева", amount: 3000, date: "2025-05-18", type: "Абонемент (8 занятий)", status: "pending", method: "" },
  { id: 5, studentId: 5, studentName: "Кирилл Морозов", amount: 5000, date: "2025-05-12", type: "Абонемент (16 занятий)", status: "paid", method: "Карта" },
  { id: 6, studentId: 6, studentName: "Алина Соколова", amount: 1500, date: "2025-05-16", type: "Разовое занятие (3)", status: "paid", method: "Перевод" },
  { id: 7, studentId: 7, studentName: "Данила Попов", amount: 5000, date: "2025-05-01", type: "Абонемент (16 занятий)", status: "overdue", method: "" },
  { id: 8, studentId: 8, studentName: "Анастасия Волкова", amount: 3000, date: "2025-05-19", type: "Абонемент (8 занятий)", status: "paid", method: "Карта" },
];

export const monthlyStats = [
  { month: "Янв", visits: 68, income: 24000, students: 6 },
  { month: "Фев", visits: 72, income: 27000, students: 7 },
  { month: "Мар", visits: 85, income: 31000, students: 7 },
  { month: "Апр", visits: 78, income: 28500, students: 8 },
  { month: "Май", visits: 91, income: 34500, students: 8 },
];

export const weeklyVisits = [
  { day: "Пн", count: 8 },
  { day: "Вт", count: 5 },
  { day: "Ср", count: 10 },
  { day: "Чт", count: 7 },
  { day: "Пт", count: 9 },
  { day: "Сб", count: 12 },
  { day: "Вс", count: 0 },
];

export const groupDistribution = [
  { name: "Начинающие", value: 2, color: "#10d9a0" },
  { name: "Юниоры A", value: 2, color: "#a855f7" },
  { name: "Юниоры B", value: 2, color: "#f97316" },
  { name: "Продвинутые", value: 2, color: "#ec4899" },
];

export const attendanceRate = [
  { week: "Нед 1", rate: 78 },
  { week: "Нед 2", rate: 85 },
  { week: "Нед 3", rate: 72 },
  { week: "Нед 4", rate: 91 },
  { week: "Нед 5", rate: 88 },
];
