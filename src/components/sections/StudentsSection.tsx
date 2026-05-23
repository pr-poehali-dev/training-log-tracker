import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import type { Store } from "@/store/useStore";
import type { Student } from "@/types";
import StudentModal from "@/components/shared/StudentModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props { store: Store }

const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

export default function StudentsSection({ store }: Props) {
  const { students, halls, groups, today, currentMon, isPresent, isPaid, isCertValid, toggleAttendance, togglePayment, addStudent, updateStudent, deleteStudent } = store;
  const [hall, setHall] = useState("all");
  const [grp, setGrp] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [infoStudent, setInfoStudent] = useState<Student | null>(null);

  const filtered = students.filter(s =>
    (hall === "all" || s.hall === hall) &&
    (grp === "all" || s.grp === grp) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.iko.toLowerCase().includes(search.toLowerCase()))
  );

  const certBadge = (s: Student) => {
    if (!s.cert) return <span className="badge-absent">Нет справки</span>;
    if (isCertValid(s)) return <span className="badge-present">✓ Справка</span>;
    return <span className="badge-absent">Просрочена</span>;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Ученики</h1>
        <Button onClick={() => { setEditStudent(null); setModalOpen(true); }}
          className="gap-2 font-semibold" style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
          <Icon name="Plus" size={16} /> Добавить
        </Button>
      </div>

      {/* Filters */}
      <div className="card-glass rounded-2xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <select value={hall} onChange={e => setHall(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="all">Все залы</option>
            {halls.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={grp} onChange={e => setGrp(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="all">Все группы</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-secondary border-border flex-1" />
          <Button size="sm" onClick={() => {
            setConfirm({ title: "Отметить всех", message: `Присутствие для ${filtered.length} учеников?`, action: () => {
              filtered.forEach(s => toggleAttendance(s.id, date, true));
            }});
          }} style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
            ✅ Всех
          </Button>
        </div>
        <Input placeholder="🔍 Поиск по имени, IKO..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-secondary border-border" />
      </div>

      {/* Student List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Users" size={40} className="mx-auto mb-3 opacity-30" />
            <p>Ученики не найдены</p>
          </div>
        )}
        {filtered.map(s => {
          const here = isPresent(s.id, date);
          const paid = isPaid(s.id, currentMon);
          return (
            <div key={s.id} className={`card-glass rounded-2xl overflow-hidden border-l-2 transition-all duration-200 hover:translate-y-[-1px] ${paid ? "border-l-[hsl(142,71%,45%)]" : "border-l-[hsl(0,72%,58%)]"}`}>
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setInfoStudent(s)}>
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center font-oswald text-base font-bold text-muted-foreground flex-shrink-0">
                  {ini(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.hall} · {s.grp} · {s.lvl}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {certBadge(s)}
                    <span className={here ? "badge-present" : "badge-absent"}>{here ? "✅ Был" : "❌ Нет"}</span>
                    <span className={paid ? "badge-paid" : "badge-overdue"}>{paid ? "💰 Оплачен" : "✗ Не оплачен"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">📅 {store.attendance.filter(a => a.sid === s.id).length}</span>
                  <span className="text-xs text-muted-foreground">👤 {store.personal.filter(p => p.sid === s.id).length}</span>
                </div>
              </div>
              <div className="flex border-t border-border/40">
                <button className={`flex-1 py-2 text-xs font-semibold transition-colors ${here ? "text-muted-foreground hover:text-foreground" : "text-[hsl(0,72%,40%)] hover:bg-[hsl(0,72%,97%)]"}`}
                  onClick={() => here ? setConfirm({ title: "Снять посещение", message: s.name, action: () => toggleAttendance(s.id, date, false) }) : toggleAttendance(s.id, date, true)}>
                  {here ? "Снять ✓" : "✅ Посещение"}
                </button>
                <div className="w-px bg-border/40" />
                <button className={`flex-1 py-2 text-xs font-semibold transition-colors ${paid ? "text-muted-foreground hover:text-foreground" : "text-[hsl(28,95%,62%)] hover:bg-[hsla(28,95%,58%,0.1)]"}`}
                  onClick={() => paid ? setConfirm({ title: "Снять оплату", message: s.name, action: () => togglePayment(s.id, currentMon, false) }) : setConfirm({ title: "Отметить оплату", message: s.name, action: () => togglePayment(s.id, currentMon, true) })}>
                  {paid ? "Снять 💰" : "💰 Оплата"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Modal */}
      {infoStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setInfoStudent(null)}>
          <div className="w-full max-w-lg bg-white border border-border/60 rounded-t-3xl p-6 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <h2 className="font-oswald text-xl tracking-wide neon-text-green mb-4">{infoStudent.name}</h2>
            {[
              ["Зал", infoStudent.hall], ["Группа", infoStudent.grp], ["Телефон", infoStudent.phone || "—"],
              ["IKO карта", infoStudent.iko || "—"], ["Уровень", infoStudent.lvl], ["Абонемент", `${infoStudent.fee} ₽`],
              ["Справка", infoStudent.cert ? (isCertValid(infoStudent) ? `✓ до ${infoStudent.ce}` : `✗ просрочена ${infoStudent.ce}`) : "Нет"],
            ].map(([l, v]) => (
              <div key={l} className="flex py-2.5 border-b border-border/30">
                <span className="text-xs text-muted-foreground uppercase tracking-wider w-28 flex-shrink-0 mt-0.5">{l}</span>
                <span className="text-sm font-semibold">{v}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-5">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditStudent(infoStudent); setInfoStudent(null); setModalOpen(true); }}>
                ✏️ Изменить
              </Button>
              <Button size="sm" className="flex-1" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,40%)", border: "1px solid hsla(0,72%,42%,0.3)" }}
                onClick={() => setConfirm({ title: "Удалить ученика", message: `Удалить "${infoStudent.name}"?`, action: () => { deleteStudent(infoStudent.id); setInfoStudent(null); } })}>
                🗑️ Удалить
              </Button>
              <Button variant="outline" size="sm" onClick={() => setInfoStudent(null)}>Закрыть</Button>
            </div>
          </div>
        </div>
      )}

      <StudentModal open={modalOpen} student={editStudent}
        onSave={data => editStudent ? updateStudent(editStudent.id, data) : addStudent(data)}
        onClose={() => setModalOpen(false)} />

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} message={confirm?.message || ""}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}