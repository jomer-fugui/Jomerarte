"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn, foldText } from "@/lib/format";

export type FilterEntry = {
  id: number | string;
  /** Texto donde se busca (ya en minúsculas y sin acentos) */
  search: string;
  cats: string[];
  node: ReactNode;
};

/**
 * Lista con buscador (lupa) y filtro por categorías, al instante y sin recargar la página.
 * La búsqueda y la categoría elegida quedan en la dirección (?q=…&cat=…) para poder compartirlas.
 */
export function FilterableList({
  entries,
  categories,
  initialQuery = "",
  initialCat = "",
  searchable,
  placeholder = "Buscar por nombre o categoría…",
  noun = "resultados",
  className,
}: {
  entries: FilterEntry[];
  categories: { name: string; count: number }[];
  initialQuery?: string;
  initialCat?: string;
  searchable: boolean;
  placeholder?: string;
  noun?: string;
  className?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [cat, setCat] = useState(initialCat);
  const first = useRef(true);

  // Guarda la búsqueda en la dirección (sin recargar) para poder compartir el enlace
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      if (cat) params.set("cat", cat);
      else params.delete("cat");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }, 350);
    return () => clearTimeout(t);
  }, [query, cat]);

  const tokens = useMemo(() => foldText(query).split(/\s+/).filter(Boolean), [query]);
  const visible = useMemo(
    () => entries.filter((e) => (!cat || e.cats.includes(cat)) && tokens.every((t) => e.search.includes(t))),
    [entries, cat, tokens],
  );
  const showSearch = searchable || initialQuery !== "";
  const showChips = categories.length >= 2 || (cat !== "" && categories.length > 0);
  const filtering = tokens.length > 0 || cat !== "";
  const clear = () => {
    setQuery("");
    setCat("");
  };

  return (
    <div className="space-y-6">
      {(showSearch || showChips) && (
        <div className="space-y-4">
          {showSearch && (
            <div role="search" className="relative max-w-2xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                enterKeyHint="search"
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 py-3.5 pr-12 pl-12 text-base text-zinc-100 transition placeholder:text-zinc-500 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label="Borrar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {showChips && (
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por categoría">
              <button
                type="button"
                onClick={() => setCat("")}
                aria-pressed={cat === ""}
                className={cn("chip hover:border-white/30", cat === "" && "chip-active")}
              >
                Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCat(cat === c.name ? "" : c.name)}
                  aria-pressed={cat === c.name}
                  className={cn("chip hover:border-white/30", cat === c.name && "chip-active")}
                >
                  {c.name}
                  {c.count > 0 && <span className="opacity-60">{c.count}</span>}
                </button>
              ))}
            </div>
          )}
          {filtering && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-400" aria-live="polite">
              {visible.length === 0 ? "Sin resultados" : `${visible.length} de ${entries.length} ${noun}`}
              {cat && (
                <span>
                  · en <strong className="text-zinc-200">{cat}</strong>
                </span>
              )}
              <button type="button" onClick={clear} className="font-semibold text-accent-light hover:text-white">
                Limpiar filtros
              </button>
            </p>
          )}
        </div>
      )}

      {visible.length > 0 ? (
        <div className={className}>
          {visible.map((e) => (
            <Fragment key={e.id}>{e.node}</Fragment>
          ))}
        </div>
      ) : (
        <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
          <Search className="h-10 w-10 text-zinc-600" />
          <p className="font-display text-xl font-bold text-white uppercase">No encontramos {noun}</p>
          <p className="max-w-md text-sm text-zinc-400">
            {query ? (
              <>
                No hay coincidencias para “<strong className="text-zinc-200">{query}</strong>”
                {cat ? ` en ${cat}` : ""}. Prueba con otra palabra o categoría.
              </>
            ) : (
              "Prueba con otra categoría."
            )}
          </p>
          <button type="button" onClick={clear} className="btn-ghost btn-sm mt-1">
            Ver todo
          </button>
        </div>
      )}
    </div>
  );
}
