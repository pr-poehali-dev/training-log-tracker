import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import type { Store } from "@/store/useStore";
import type { Note } from "@/types";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props { store: Store }

export default function NotesSection({ store }: Props) {
  const { notes, today, addNote, updateNote, deleteNote } = store;
  const [modalOpen, setModalOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [form, setForm] = useState({ ttl: "", bod: "", tags: "", imp: false });

  const openModal = (n?: Note) => {
    setEditNote(n || null);
    setForm(n ? { ttl: n.ttl, bod: n.bod, tags: n.tags, imp: n.imp } : { ttl: "", bod: "", tags: "", imp: false });
    setModalOpen(true);
  };

  const save = () => {
    if (!form.ttl.trim()) return;
    if (editNote) updateNote(editNote.id, { ...form, date: today });
    else addNote({ ...form, date: today });
    setModalOpen(false);
  };

  const sorted = [...notes].sort((a, b) => {
    if (a.imp !== b.imp) return a.imp ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Заметки</h1>
        <Button onClick={() => openModal()} style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>
          <Icon name="Plus" size={16} className="mr-1" /> Добавить
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="FileText" size={48} className="mx-auto mb-3 opacity-20" />
          <p>Нет заметок</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(n => (
            <div key={n.id} className={`card-glass rounded-2xl p-4 border-l-2 ${n.imp ? "border-l-[hsl(0,72%,58%)]" : "border-l-[hsl(220,15%,25%)]"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {n.imp && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(0,72%,97%)", color: "hsl(0,72%,40%)", border: "1px solid hsla(0,72%,42%,0.3)" }}>Важно</span>}
                  <h3 className="font-semibold text-sm">{n.ttl}</h3>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{n.date}</span>
              </div>
              {n.bod && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{n.bod.substring(0, 150)}{n.bod.length > 150 ? "…" : ""}</p>}
              {n.tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {n.tags.split(",").filter(t => t.trim()).map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "hsl(220,15%,16%)", color: "hsl(215,20%,60%)", border: "1px solid hsl(220,15%,22%)" }}>
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => openModal(n)}>✏️ Изменить</button>
                <button className="text-xs text-muted-foreground hover:text-red-400 transition-colors ml-2" onClick={() => setConfirm({ title: "Удалить", message: `Удалить "${n.ttl}"?`, action: () => deleteNote(n.id) })}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm" style={{ background: "#fff", border: "1px solid hsl(0,0%,88%)" }}>
          <DialogHeader>
            <DialogTitle className="font-oswald text-xl tracking-wide neon-text-green">
              {editNote ? "Редактировать" : "Новая заметка"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Заголовок *</Label>
              <Input value={form.ttl} onChange={e => setForm(p => ({ ...p, ttl: e.target.value }))} placeholder="Заголовок" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Текст</Label>
              <textarea value={form.bod} onChange={e => setForm(p => ({ ...p, bod: e.target.value }))} rows={4}
                placeholder="Содержание..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Теги (через запятую)</Label>
              <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="план,тренировка" className="bg-secondary border-border" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.imp} onChange={e => setForm(p => ({ ...p, imp: e.target.checked }))} className="accent-primary w-4 h-4" />
              Важная заметка
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Отмена</Button>
              <Button onClick={save} className="flex-1" style={{ background: "hsl(0,72%,40%)", color: "#fff", fontWeight: 700 }}>Сохранить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirm} title={confirm?.title || ""} message={confirm?.message || ""}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}