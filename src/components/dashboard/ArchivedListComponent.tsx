import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";
import type { AppUser } from "@/pages/Index";
import { Loading, inputCls, ini } from "./trainer-ui";

export function ArchivedList({ user }: { user: AppUser }) {
  const [search, setSearch] = useState("");
  const { data: archived = [], isLoading } = useQuery({
    queryKey: ["students-archived", user.id],
    queryFn: () => studentsApi.listArchived(),
  });

  if (isLoading) return <Loading />;

  const list = (archived as Record<string, unknown>[]).filter(s =>
    !search || (s.name as string)?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Поиск */}
      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className={`${inputCls} pl-8 pr-8`}
          placeholder="Поиск по имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="X" size={13} /></button>}
      </div>

      {list.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Icon name="Archive" size={36} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">{(archived as []).length === 0 ? "Архив пуст" : "Ничего не найдено"}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {list.map(s => (
          <div key={s.id as number} className="card-glass rounded-xl p-3 border-l-2 border-l-gray-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex gap-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-oswald font-bold text-gray-400 flex-shrink-0">
                  {ini(s.name as string)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-600 truncate">{s.name as string}</div>
                  <div className="text-xs text-gray-400">
                    {[s.hall, s.hall2, s.grp].filter(Boolean).join(" · ")}
                    {s.has_sport && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-semibold">Спорт</span>}
                  </div>
                  {s.birthdate && (
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Icon name="Cake" size={10} />{(s.birthdate as string).split("-").reverse().join(".")}
                    </div>
                  )}
                  {s.phone && (
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Icon name="Phone" size={10} />{s.phone as string}
                    </div>
                  )}
                  {s.archive_reason && (
                    <div className="text-xs text-orange-500 mt-1 flex items-start gap-1">
                      <Icon name="Info" size={11} className="mt-0.5 flex-shrink-0" />
                      {s.archive_reason as string}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-gray-300 whitespace-nowrap flex-shrink-0">
                {s.archived_at ? new Date(s.archived_at as string).toLocaleDateString("ru") : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-[11px] text-gray-300 pb-2">
        {(archived as []).length} уч. в архиве
      </div>
    </div>
  );
}
