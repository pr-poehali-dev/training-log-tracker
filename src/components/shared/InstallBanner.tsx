import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Уже установлено как PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS — показываем инструкцию
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as unknown as { standalone?: boolean }).standalone;
    setIsIos(!!ios);

    // Android — перехватываем системный промпт
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const wasDismissed = localStorage.getItem("iko_install_dismissed");

  if (isInstalled || wasDismissed || dismissed) return null;
  if (!prompt && !isIos) return null;

  const dismiss = () => {
    localStorage.setItem("iko_install_dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "hsl(0,72%,40%)" }}>
        <Icon name="Smartphone" size={16} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-red-900">Установить приложение</div>
        {isIos ? (
          <div className="text-xs text-red-700 mt-0.5">
            Нажмите <strong>Поделиться →</strong> затем <strong>«На экран «Домой»</strong> — приложение будет работать офлайн
          </div>
        ) : (
          <div className="text-xs text-red-700 mt-0.5">
            Установите на телефон — будет работать без интернета
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIos && prompt && (
          <button onClick={install}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "hsl(0,72%,40%)" }}>
            Установить
          </button>
        )}
        <button onClick={dismiss} className="text-red-400 hover:text-red-600 p-1">
          <Icon name="X" size={14} />
        </button>
      </div>
    </div>
  );
}
