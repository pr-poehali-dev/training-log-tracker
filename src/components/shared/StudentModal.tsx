import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Student } from "@/types";

interface Props {
  open: boolean;
  student?: Student | null;
  onSave: (data: Omit<Student, "id">) => void;
  onClose: () => void;
}

const empty = { name: "", hall: "Основной зал", grp: "Группа А", phone: "", iko: "", fee: 3000, lvl: "10 кю", cert: false, ci: "", ce: "" };

export default function StudentModal({ open, student, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Student, "id">>(empty);
  useEffect(() => { setForm(student ? { ...student } : { ...empty }); }, [student, open]);
  const set = (k: keyof typeof form, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,20%)" }}>
        <DialogHeader>
          <DialogTitle className="font-oswald text-xl tracking-wide neon-text-green">
            {student ? `Редактировать: ${student.name}` : "Новый ученик"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Имя *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Иван Иванов"
              className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Зал</Label>
              <Input value={form.hall} onChange={e => set("hall", e.target.value)} placeholder="Основной зал"
                className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Группа</Label>
              <Input value={form.grp} onChange={e => set("grp", e.target.value)} placeholder="Группа А"
                className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Телефон</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 999 000-00-00"
                className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">IKO карта</Label>
              <Input value={form.iko} onChange={e => set("iko", e.target.value)} placeholder="IKO-2024-001"
                className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Абонемент ₽</Label>
              <Input type="number" value={form.fee} onChange={e => set("fee", parseInt(e.target.value) || 0)}
                className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Уровень</Label>
              <Input value={form.lvl} onChange={e => set("lvl", e.target.value)} placeholder="10 кю"
                className="bg-secondary border-border" />
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm mb-3">
              <input type="checkbox" checked={form.cert} onChange={e => set("cert", e.target.checked)} className="accent-primary w-4 h-4" />
              Медицинская справка
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Выдана</Label>
                <Input type="date" value={form.ci} onChange={e => set("ci", e.target.value)}
                  className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Действует до</Label>
                <Input type="date" value={form.ce} onChange={e => set("ce", e.target.value)}
                  className="bg-secondary border-border" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
            <Button onClick={() => { if (!form.name.trim()) return; onSave(form); onClose(); }}
              className="flex-1" style={{ background: "hsl(168,85%,50%)", color: "hsl(220,20%,6%)", fontWeight: 700 }}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
