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
      <DialogContent className="max-w-sm" style={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,20%)" }}>
        <DialogHeader>
          <DialogTitle className="font-oswald text-lg tracking-wide">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Отмена</Button>
          <Button
            onClick={onConfirm}
            className="flex-1"
            style={danger ? { background: "hsl(0,72%,58%)", color: "#fff" } : { background: "hsl(168,85%,50%)", color: "hsl(220,20%,6%)" }}
          >
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
