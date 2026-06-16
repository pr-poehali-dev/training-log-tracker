import { PrimaryBtn, OutlineBtn, inputCls } from "./trainer-ui";

export type TeamLevel = "regular" | "first" | "national";

export type FormState = {
  name: string; hall: string; hall2: string; grp: string; schedule: string;
  phone: string; iko: string; fee: number; annual_fee_number: string; lvl: string;
  cert: boolean; cert_from: string; cert_to: string;
  birthdate: string; insurance: boolean; insurance_to: string;
  has_sport: boolean; sport_schedule: string;
  team_level: TeamLevel;
};

export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function StudentForm({ form, setForm, onSubmit, onCancel, saving, submitLabel, listSuffix = "" }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  listSuffix?: string;
}) {
  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement).type === "number" ? +(e.target as HTMLInputElement).value : e.target.value }));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input className={inputCls} placeholder="Имя *" value={form.name} onChange={f("name")} required />

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Залы</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Зал 1" list={`dl-halls${listSuffix}`} value={form.hall} onChange={f("hall")} />
        <input className={inputCls} placeholder="Зал 2 (если есть)" list={`dl-halls${listSuffix}`} value={form.hall2} onChange={f("hall2")} />
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Группа и контакт</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Группа" list={`dl-grps${listSuffix}`} value={form.grp} onChange={f("grp")} />
        <input className={inputCls} placeholder="Время группы" list={`dl-schedules${listSuffix}`} value={form.schedule} onChange={f("schedule")} />
        <input className={inputCls} placeholder="Телефон" value={form.phone} onChange={f("phone")} />
        <input className={inputCls} placeholder="IKO карта" value={form.iko} onChange={f("iko")} />
        <input className={inputCls} placeholder="Уровень / пояс" value={form.lvl} onChange={f("lvl")} />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Дата рождения</label>
          <input className={inputCls} type="date" value={form.birthdate} onChange={f("birthdate")} />
        </div>
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Оплата</div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Абонемент ₽" type="number" value={form.fee} onChange={f("fee")} />
        <input className={inputCls} placeholder="№ годового взноса" value={form.annual_fee_number} onChange={f("annual_fee_number")} />
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Медицинская справка</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.cert} onChange={f("cert")} className="accent-red-600 w-4 h-4" />
        Есть медицинская справка
      </label>
      {form.cert && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Дата выдачи</div>
              <input className={inputCls} type="date" value={form.cert_from} onChange={f("cert_from")} />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Дата окончания</div>
              <input className={inputCls} type="date" value={form.cert_to} onChange={f("cert_to")} />
            </div>
          </div>
          {form.cert_from && (
            <div className="flex gap-2">
              <button type="button"
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => setForm(p => ({ ...p, cert_to: addMonths(p.cert_from, 6) }))}>
                + 6 месяцев
              </button>
              <button type="button"
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => setForm(p => ({ ...p, cert_to: addMonths(p.cert_from, 12) }))}>
                + 1 год
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Страховка</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.insurance} onChange={f("insurance")} className="accent-red-600 w-4 h-4" />
        Есть страховка
      </label>
      {form.insurance && (
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Страховка действует до</div>
            <input className={inputCls} type="date" value={form.insurance_to} onChange={f("insurance_to")} />
          </div>
        </div>
      )}

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Состав / уровень</div>
      <div className="grid grid-cols-3 gap-2">
        {([
          { value: "regular",  label: "Обычный",   color: "#9ca3af", bg: "#f3f4f6" },
          { value: "first",    label: "1 состав",  color: "#1d4ed8", bg: "#dbeafe" },
          { value: "national", label: "Сборная",   color: "#991b1b", bg: "#fee2e2" },
        ] as { value: TeamLevel; label: string; color: string; bg: string }[]).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setForm(p => ({ ...p, team_level: opt.value }))}
            className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
            style={{
              background: form.team_level === opt.value ? opt.bg : "#f9fafb",
              borderColor: form.team_level === opt.value ? opt.color : "#e5e7eb",
              color: form.team_level === opt.value ? opt.color : "#9ca3af",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Спортивная группа</div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.has_sport} onChange={f("has_sport")} className="accent-blue-600 w-4 h-4" />
        Ходит в спортивную группу
      </label>
      {form.has_sport && (
        <div>
          <div className="text-[10px] text-gray-400 mb-1">Расписание спортивной группы</div>
          <input className={inputCls} placeholder="Например: вт/чт 19:00" value={form.sport_schedule} onChange={f("sport_schedule")} />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <OutlineBtn onClick={onCancel}>Отмена</OutlineBtn>
        <PrimaryBtn type="submit" disabled={saving}>{saving ? "Сохранение..." : submitLabel}</PrimaryBtn>
      </div>
    </form>
  );
}