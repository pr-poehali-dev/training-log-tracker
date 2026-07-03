import Icon from "@/components/ui/icon";

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monStr = () => new Date().toISOString().slice(0, 7);
export const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

// Полных лет по дате рождения
export const calcAge = (birthdate?: string | null): number | null => {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
};

// Склонение: 5 лет / 21 год / 22 года
export const ageLabel = (age: number): string => {
  const mod10 = age % 10, mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${age} года`;
  return `${age} лет`;
};

export const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200";

export function PrimaryBtn({ children, onClick, type = "button", disabled }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
      style={{ background: "hsl(0,72%,40%)", color: "#fff" }}>
      {children}
    </button>
  );
}

export function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}

export function Loading() {
  return <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка...</div>;
}

export function ErrBlock({ msg }: { msg: string }) {
  return <div className="text-center py-8 text-red-500 text-sm">{msg}</div>;
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 py-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="font-oswald text-lg font-bold tracking-wide mb-4" style={{ color: "hsl(0,72%,40%)" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}