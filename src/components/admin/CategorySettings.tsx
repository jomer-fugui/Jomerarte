"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp } from "lucide-react";
import { saveCategoryOptionsAction } from "@/app/admin/menu-actions";
import { cn } from "@/lib/format";
import { sortCategories, type CatSort, type CatStyle, type PageOptions } from "@/lib/sections";
import { SubmitButton } from "./SubmitButton";

const SORTS: { key: CatSort; label: string; hint: string }[] = [
  { key: "alpha", label: "Alfabético (A → Z)", hint: "Ordenadas por nombre." },
  { key: "count", label: "Más usadas primero", hint: "Primero las que tienen más publicaciones." },
  { key: "custom", label: "Personalizado", hint: "Tú eliges el orden con las flechas." },
];

const STYLES: { key: CatStyle; label: string; hint: string }[] = [
  { key: "slider", label: "Deslizable", hint: "Una sola fila que se desliza, con botón para ver todas." },
  { key: "dropdown", label: "Botón desplegable", hint: "Solo un botón “Categorías”: la lista se abre al tocarlo." },
  { key: "chips", label: "Todas visibles", hint: "Todas a la vista (ideal si son pocas)." },
];

/** Orden y forma de mostrar las categorías de una página (para los visitantes). */
export function CategorySettings({
  sectionKey,
  site,
  categories,
  options,
}: {
  sectionKey: string;
  site: string;
  categories: { name: string; count: number }[];
  options: PageOptions;
}) {
  const counts = new Map(categories.map((c) => [c.name, c.count] as const));
  const countOf = (c: string) => counts.get(c) ?? 0;
  const names = categories.map((c) => c.name);
  const [sort, setSort] = useState<CatSort>(options.catSort ?? "alpha");
  const [style, setStyle] = useState<CatStyle>(options.catStyle ?? "slider");
  const [order, setOrder] = useState<string[]>(() =>
    sortCategories(names, countOf, { catSort: "custom", catOrder: options.catOrder ?? [] }),
  );
  const shown = sort === "custom" ? order : sortCategories(names, countOf, { catSort: sort });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || to === from) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
  };

  return (
    <details className="card group p-6">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span>
          <span className="block font-display text-lg font-bold tracking-wide text-white uppercase">
            Categorías ({names.length})
          </span>
          <span className="text-sm text-zinc-500">
            Orden: {SORTS.find((s) => s.key === (options.catSort ?? "alpha"))?.label} · Estilo:{" "}
            {STYLES.find((s) => s.key === (options.catStyle ?? "slider"))?.label}
          </span>
        </span>
        <span className="text-xs font-semibold text-accent-light group-open:hidden">Cambiar orden y estilo</span>
      </summary>

      <form action={saveCategoryOptionsAction} className="mt-6 space-y-6">
        <input type="hidden" name="key" value={sectionKey} />
        <input type="hidden" name="__site" value={site} />
        <input type="hidden" name="options" value={JSON.stringify({ catSort: sort, catStyle: style, catOrder: order })} />

        <fieldset>
          <legend className="label">Orden de las categorías</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {SORTS.map((s) => (
              <label
                key={s.key}
                className={cn(
                  "flex cursor-pointer gap-2 rounded-xl border p-3 text-sm transition",
                  sort === s.key ? "border-accent bg-accent/10" : "border-white/10 bg-white/[0.03] hover:border-white/30",
                )}
              >
                <input
                  type="radio"
                  name="__catSort"
                  checked={sort === s.key}
                  onChange={() => setSort(s.key)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-semibold text-white">{s.label}</span>
                  <span className="text-xs text-zinc-400">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Cómo se muestran a los visitantes</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STYLES.map((s) => (
              <label
                key={s.key}
                className={cn(
                  "flex cursor-pointer gap-2 rounded-xl border p-3 text-sm transition",
                  style === s.key ? "border-accent bg-accent/10" : "border-white/10 bg-white/[0.03] hover:border-white/30",
                )}
              >
                <input
                  type="radio"
                  name="__catStyle"
                  checked={style === s.key}
                  onChange={() => setStyle(s.key)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-semibold text-white">{s.label}</span>
                  <span className="text-xs text-zinc-400">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {names.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no hay categorías: aparecen cuando agregas contenido con categorías.
          </p>
        ) : sort === "custom" ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-400">Empezar desde:</span>
              <button type="button" onClick={() => setOrder(sortCategories(names, countOf))} className="chip hover:border-white/30">
                A → Z
              </button>
              <button
                type="button"
                onClick={() => setOrder(sortCategories(names, countOf, { catSort: "count" }))}
                className="chip hover:border-white/30"
              >
                Más usadas
              </button>
            </div>
            <ol className="max-h-96 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10">
              {order.map((c, i) => (
                <li key={c} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="w-6 text-right text-xs text-zinc-600">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{c}</span>
                  <span className="text-xs text-zinc-500">{countOf(c)}</span>
                  <button
                    type="button"
                    onClick={() => move(i, 0)}
                    disabled={i === 0}
                    title="Al principio"
                    aria-label={`Mover ${c} al principio`}
                    className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    title="Subir"
                    aria-label={`Subir ${c}`}
                    className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === order.length - 1}
                    title="Bajar"
                    aria-label={`Bajar ${c}`}
                    className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div>
            <p className="label">Así quedan ordenadas</p>
            <div className="flex flex-wrap gap-1.5">
              {shown.slice(0, 30).map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
              {shown.length > 30 && <span className="chip">+{shown.length - 30} más</span>}
            </div>
          </div>
        )}

        <SubmitButton>Guardar categorías</SubmitButton>
      </form>
    </details>
  );
}
