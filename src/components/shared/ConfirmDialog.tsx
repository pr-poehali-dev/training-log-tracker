import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm" style={{ background: "#fff", border: "1px solid hsl(0,0%,88%)" }}>
        <DialogHeader>
          <DialogTitle className="font-oswald text-lg tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Отмена</Button>
          <Button
            onClick={onConfirm}
            className="flex-1"
            style={{ background: "hsl(0,72%,40%)", color: "#fff" }}
          >
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}