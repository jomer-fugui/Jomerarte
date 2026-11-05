"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Search, X } from "lucide-react";
import { cn, foldText } from "@/lib/format";
import type { CatStyle } from "@/lib/sections";

export type FilterEntry = {
  id: number | string;
  /** Texto donde se busca (ya en minúsculas y sin acentos) */
  search: string;
  cats: string[];
  node: ReactNode;
};

type Cat = { name: string; count: number };

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
  categoryStyle = "slider",
}: {
  entries: FilterEntry[];
  /** Ya vienen ordenadas (alfabético, más usadas o personalizado) */
  categories: Cat[];
  initialQuery?: string;
  initialCat?: string;
  searchable: boolean;
  placeholder?: string;
  noun?: string;
  className?: string;
  categoryStyle?: CatStyle;
}) {
  /**
   * La página se sirve desde la caché (siempre igual), así que la búsqueda y la categoría de la
   * dirección (?q=…&cat=…) se leen en el navegador: así los enlaces a una categoría siguen
   * funcionando. `useSyncExternalStore` permite leer la dirección sin romper la hidratación.
   */
  const urlSearch = useSyncExternalStore(subscribeToUrl, currentUrlSearch, () => "");
  const fromUrl = useMemo(() => {
    const params = new URLSearchParams(urlSearch);
    return { query: params.get("q") ?? initialQuery, cat: params.get("cat") ?? initialCat };
  }, [urlSearch, initialQuery, initialCat]);

  // Lo que escribe el visitante manda sobre lo que venía en la dirección.
  const [typed, setTyped] = useState<{ query: string; cat: string } | null>(null);
  const query = typed?.query ?? fromUrl.query;
  const cat = typed?.cat ?? fromUrl.cat;
  const setQuery = (value: string) => setTyped({ query: value, cat });
  const setCat = (value: string) => setTyped({ query, cat: value });
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
  const showSearch = searchable || query !== "";
  const showCats = categories.length >= 2 || (cat !== "" && categories.length > 0);
  const filtering = tokens.length > 0 || cat !== "";
  const clear = () => setTyped({ query: "", cat: "" });

  return (
    <div className="space-y-6">
      {(showSearch || showCats) && (
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
          {showCats && <CategoryBar categories={categories} active={cat} onSelect={setCat} style={categoryStyle} />}
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

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-active={active ? "true" : undefined}
      className={cn("chip shrink-0 snap-start whitespace-nowrap hover:border-white/30", active && "chip-active")}
    >
      {label}
      {count ? <span className="opacity-60">{count}</span> : null}
    </button>
  );
}

/**
 * Categorías para el visitante, en una de tres formas (se elige en el panel para cada página):
 *  - slider:   una sola fila que se desliza (con flechas en computadora) + botón para ver todas
 *  - dropdown: solo un botón “Categorías” que despliega la lista completa
 *  - chips:    todas a la vista
 */
function CategoryBar({
  categories,
  active,
  onSelect,
  style,
}: {
  categories: Cat[];
  active: string;
  onSelect: (c: string) => void;
  style: CatStyle;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [edges, setEdges] = useState({ left: false, right: false });
  const rowRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const total = categories.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Muestra las flechas y el sombreado solo cuando hay más categorías hacia los costados
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [style, total]);

  // La categoría elegida siempre queda a la vista dentro de la fila
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[data-active="true"]');
    if (!row || !el) return;
    row.scrollTo({ left: Math.max(0, el.offsetLeft - (row.clientWidth - el.clientWidth) / 2), behavior: "smooth" });
  }, [active, style]);

  const pick = (c: string) => {
    onSelect(c);
    setOpen(false);
    setFilter("");
  };
  const scrollBy = (dir: -1 | 1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: "smooth" });
  };

  if (style === "chips") {
    return (
      <div className="flex flex-wrap gap-2" data-cat-style="chips" aria-label="Filtrar por categoría">
        <Chip label="Todas" active={!active} onClick={() => onSelect("")} />
        {categories.map((c) => (
          <Chip key={c.name} label={c.name} count={c.count} active={active === c.name} onClick={() => onSelect(active === c.name ? "" : c.name)} />
        ))}
      </div>
    );
  }

  const needle = foldText(filter).trim();
  const listed = needle ? categories.filter((c) => foldText(c.name).includes(needle)) : categories;
  const panel = open ? (
    <div id={panelId} className="rounded-2xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl shadow-black/40 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        {total > 10 ? (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar categoría…"
              aria-label="Buscar categoría"
              className="input py-2 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        ) : (
          <p className="flex-1 text-sm font-semibold text-white">Categorías</p>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar categorías"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain sm:grid-cols-3 lg:grid-cols-4">
        {!needle && (
          <button
            type="button"
            onClick={() => pick("")}
            aria-pressed={!active}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
              !active ? "bg-accent text-white" : "text-zinc-200 hover:bg-white/10",
            )}
          >
            Todas
          </button>
        )}
        {listed.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => pick(c.name)}
            aria-pressed={active === c.name}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
              active === c.name ? "bg-accent text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="truncate">{c.name}</span>
            {c.count > 0 && <span className="shrink-0 text-xs opacity-60">{c.count}</span>}
          </button>
        ))}
        {listed.length === 0 && <p className="col-span-full px-3 py-2 text-sm text-zinc-500">No hay categorías con ese nombre.</p>}
      </div>
    </div>
  ) : null;

  if (style === "dropdown") {
    return (
      <div className="space-y-3" data-cat-style="dropdown">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/30"
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-accent-light" />
            <span className="truncate">
              Categorías: <span className="text-white">{active || "Todas"}</span>
            </span>
            <span className="text-xs opacity-60">{total}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
          </button>
          {active && (
            <button type="button" onClick={() => onSelect("")} className="chip gap-1 hover:border-white/30">
              Quitar filtro <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {panel}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-cat-style="slider">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          title="Ver todas las categorías"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
            open ? "border-accent bg-accent/15 text-white" : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/30",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 text-accent-light" />
          <span className="hidden sm:inline">Categorías</span>
          <span className="opacity-60">{total}</span>
        </button>
        <div className="relative min-w-0 flex-1">
          <div ref={rowRef} className="no-scrollbar relative flex snap-x gap-2 overflow-x-auto py-0.5" aria-label="Filtrar por categoría">
            <Chip label="Todas" active={!active} onClick={() => onSelect("")} />
            {categories.map((c) => (
              <Chip key={c.name} label={c.name} count={c.count} active={active === c.name} onClick={() => onSelect(active === c.name ? "" : c.name)} />
            ))}
          </div>
          {edges.left && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-linear-to-r from-zinc-950 to-transparent" />
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                className="absolute top-1/2 left-0 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-zinc-900 text-white shadow sm:grid"
                aria-label="Ver categorías anteriores"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
          {edges.right && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-zinc-950 to-transparent" />
              <button
                type="button"
                onClick={() => scrollBy(1)}
                className="absolute top-1/2 right-0 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-zinc-900 text-white shadow sm:grid"
                aria-label="Ver más categorías"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {panel}
    </div>
  );
}

/** Suscribe a los cambios de la dirección (atrás/adelante del navegador). */
function subscribeToUrl(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function currentUrlSearch(): string {
  return window.location.search;
}
