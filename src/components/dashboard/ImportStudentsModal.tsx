import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { importStudentsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

const TEMPLATE_CSV = `Имя,Зал,Группа,Телефон,ИКО,Абонемент,Уровень,Дата рождения,Расписание
Иванов Иван,Зал 1,Дети,79001234567,,5000,Кихон,15.03.2010,Пн Ср Пт
Петрова Мария,Зал 2,Взрослые,79009876543,,6000,,22.07.1995,Вт Чт`;

function downloadTemplate() {
  const bom = "\uFEFF";
  const blob = new Blob([bom + TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "шаблон_ученики.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Result = { added: number; skipped: number; skipped_details: { row: number; name?: string; reason: string }[] };

export default function ImportStudentsModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStage("loading");
    setErrMsg("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // base64 encode
      let binary = "";
      bytes.forEach(b => binary += String.fromCharCode(b));
      const b64 = btoa(binary);

      const res = await importStudentsApi.upload(b64);
      setResult(res);
      setStage("done");
      if (res.added > 0) {
        qc.invalidateQueries({ queryKey: ["students"] });
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Ошибка загрузки");
      setStage("error");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-oswald font-bold text-base tracking-wide text-gray-800">Импорт учеников</h2>
            <p className="text-xs text-gray-400 mt-0.5">CSV-файл, до 500 учеников за раз</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">

          {/* Шаг 1 — скачать шаблон */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(0,72%,95%)" }}>
              <Icon name="Download" size={16} style={{ color: "hsl(0,72%,40%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-700">Шаг 1: скачайте шаблон</div>
              <div className="text-xs text-gray-400">Заполните и сохраните как CSV</div>
            </div>
            <button onClick={downloadTemplate}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex-shrink-0">
              Скачать
            </button>
          </div>

          {/* Шаг 2 — загрузить файл */}
          {stage === "idle" || stage === "error" ? (
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors">
              <Icon name="Upload" size={24} className="text-gray-300" />
              <div className="text-sm font-semibold text-gray-500">Шаг 2: загрузите CSV</div>
              <div className="text-xs text-gray-400">Нажмите или перетащите файл сюда</div>
              {errMsg && <div className="text-xs text-red-500 text-center mt-1">{errMsg}</div>}
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={onFileChange} />
            </div>
          ) : stage === "loading" ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Icon name="Loader2" size={28} className="animate-spin text-gray-400" />
              <div className="text-sm text-gray-500">Загружаем <b>{fileName}</b>...</div>
            </div>
          ) : stage === "done" && result ? (
            <div className="flex flex-col gap-3">
              {/* Итог */}
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "hsl(142,60%,93%)" }}>
                  <div className="text-xl font-bold" style={{ color: "hsl(142,60%,30%)" }}>{result.added}</div>
                  <div className="text-xs" style={{ color: "hsl(142,60%,35%)" }}>добавлено</div>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: result.skipped > 0 ? "hsl(38,90%,93%)" : "hsl(0,0%,95%)" }}>
                  <div className="text-xl font-bold" style={{ color: result.skipped > 0 ? "hsl(38,90%,35%)" : "#9ca3af" }}>{result.skipped}</div>
                  <div className="text-xs" style={{ color: result.skipped > 0 ? "hsl(38,90%,40%)" : "#9ca3af" }}>пропущено</div>
                </div>
              </div>

              {/* Детали пропущенных */}
              {result.skipped_details.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 max-h-32 overflow-y-auto">
                  <div className="text-xs font-semibold text-amber-700 mb-1.5">Не добавлены:</div>
                  {result.skipped_details.map((d, i) => (
                    <div key={i} className="text-xs text-amber-600">
                      Строка {d.row}{d.name ? ` (${d.name})` : ""}: {d.reason}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={onDone}
                className="w-full py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: "hsl(0,72%,40%)" }}>
                Готово
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
