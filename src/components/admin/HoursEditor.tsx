"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { WEEK, hoursText, parseHours, serializeHours, type DayKey, type HoursSpec } from "@/lib/seo";

const PRESETS: { label: string; days: DayKey[]; o: string; c: string }[] = [
  { label: "Lun a Vie 8 a 18", days: ["Mo", "Tu", "We", "Th", "Fr"], o: "08:00", c: "18:00" },
  { label: "Lun a Sáb 8 a 20", days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"], o: "08:00", c: "20:00" },
  { label: "Todos los días 24 hs", days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], o: "00:00", c: "23:59" },
];

/** Editor de horarios por día (se guardan en un formato que entienden Google y las IA). */
export function HoursEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [spec, setSpec] = useState<HoursSpec>(() => parseHours(defaultValue));
  const setDay = (d: DayKey, v: { o: string; c: string } | null) =>
    setSpec((prev) => {
      const next = { ...prev };
      if (v) next[d] = v;
      else delete next[d];
      return next;
    });
  const preview = hoursText(spec);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serializeHours(spec)} />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setSpec(Object.fromEntries(p.days.map((d) => [d, { o: p.o, c: p.c }])) as HoursSpec)}
            className="chip hover:border-white/30"
          >
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setSpec({})} className="chip hover:border-white/30">
          Borrar horarios
        </button>
      </div>
      <div className="divide-y divide-white/5 rounded-xl border border-white/10">
        {WEEK.map((d) => {
          const h = spec[d.key];
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <label className="flex w-32 items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={Boolean(h)}
                  onChange={(e) => setDay(d.key, e.target.checked ? { o: "08:00", c: "18:00" } : null)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {d.long}
              </label>
              {h ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="time"
                    value={h.o}
                    onChange={(e) => e.target.value && setDay(d.key, { ...h, o: e.target.value })}
                    aria-label={`${d.long}: abre`}
                    className="input w-auto py-1.5"
                  />
                  a
                  <input
                    type="time"
                    value={h.c}
                    onChange={(e) => e.target.value && setDay(d.key, { ...h, c: e.target.value })}
                    aria-label={`${d.long}: cierra`}
                    className="input w-auto py-1.5"
                  />
                </div>
              ) : (
                <span className="text-sm text-zinc-600">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
      <p className={cn("text-xs", preview ? "text-zinc-400" : "text-zinc-600")}>
        {preview ? `Así se verá: ${preview}` : "Sin horarios cargados."}
      </p>
    </div>
  );
}
