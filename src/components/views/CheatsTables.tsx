"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { cn, foldText, slugify } from "@/lib/format";
import { cheatSheetText, cheatSearchText, plainCheatText } from "@/lib/cheats";
import { CopyButton, DownloadTextButton, PrintButton } from "../client";
import { currentUrlSearch, subscribeToUrl } from "../FilterableList";

/** Un truco ya listo para mostrar (sin datos internos de la base) */
export type CheatRow = {
  id: number;
  code: string;
  purpose: string;
  detail: string;
  cats: string[];
};

/** Todos los trucos de un juego */
export type CheatGame = {
  name: string;
  rows: CheatRow[];
};

type Cat = { name: string; count: number };

/**
 * Trucos de juegos: un cuadro por juego con buscador (por juego, código, “para qué sirve”,
 * detalle o categoría), botón para copiar cada código, copiar todos, imprimir / guardar PDF
 * y descargar el juego completo como archivo de texto.
 */
export function CheatsTables({
  games,
  categories,
  initialQuery = "",
  initialCat = "",
  placeholder = "Buscar juego, código o para qué sirve… (ej: armas, sin policías)",
}: {
  games: CheatGame[];
  categories: Cat[];
  initialQuery?: string;
  initialCat?: string;
  placeholder?: string;
}) {
  // La página se sirve desde la caché, así que la búsqueda y la categoría se leen en el navegador.
  const urlSearch = useSyncExternalStore(subscribeToUrl, currentUrlSearch, () => "");
  const fromUrl = useMemo(() => {
    const params = new URLSearchParams(urlSearch);
    return { query: params.get("q") ?? initialQuery, cat: params.get("cat") ?? initialCat };
  }, [urlSearch, initialQuery, initialCat]);

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

  /** Cada truco con el texto donde se busca: juego, categorías, código, “para qué sirve” y detalle. */
  const indexed = useMemo(
    () =>
      games.map((g) => ({
        name: g.name,
        rows: g.rows.map((r) => ({ row: r, search: cheatSearchText(g.name, r) })),
      })),
    [games],
  );

  const visible = useMemo(
    () =>
      indexed
        .map((g) => ({
          name: g.name,
          rows: g.rows.filter((x) => (!cat || x.row.cats.includes(cat)) && tokens.every((t) => x.search.includes(t))),
        }))
        .filter((g) => g.rows.length > 0),
    [indexed, cat, tokens],
  );

  const totalRows = games.reduce((n, g) => n + g.rows.length, 0);
  const shownRows = visible.reduce((n, g) => n + g.rows.length, 0);
  const filtering = tokens.length > 0 || cat !== "";
  const clear = () => setTyped({ query: "", cat: "" });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="search" className="relative w-full max-w-2xl">
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
          <PrintButton label="Imprimir todo / PDF" />
        </div>

        {categories.length >= 2 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCat(cat === c.name ? "" : c.name)}
                aria-pressed={cat === c.name}
                className={cn("chip hover:border-white/30", cat === c.name && "chip-active")}
              >
                {c.name}
                <span className="opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
        )}

        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-400" aria-live="polite">
          {visible.length === 0
            ? "Sin resultados"
            : filtering
              ? `${shownRows} de ${totalRows} trucos · ${visible.length} ${visible.length === 1 ? "juego" : "juegos"}`
              : `${totalRows} trucos · ${games.length} ${games.length === 1 ? "juego" : "juegos"}`}
          {filtering && (
            <button type="button" onClick={clear} className="font-semibold text-accent-light hover:text-white">
              Limpiar filtros
            </button>
          )}
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-8">
          {visible.map((g, i) => {
            const rows = g.rows.map((x) => x.row);
            const id = `trucos-${i}-${slugify(g.name) || "juego"}`;
            const fileName = `${(slugify(g.name) || "trucos").toLowerCase()}.txt`;
            const codes = rows.map((r) => r.code).filter(Boolean).join("\n");
            return (
              <section key={g.name} id={id} className="card print-plain overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-3">
                  <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">
                    {g.name}
                    <span className="ml-2 text-sm font-semibold text-zinc-400 normal-case">
                      {rows.length} {rows.length === 1 ? "truco" : "trucos"}
                    </span>
                  </h2>
                  <div className="flex flex-wrap gap-2 no-print">
                    {codes && <CopyButton text={codes} label="Copiar códigos" />}
                    <DownloadTextButton text={cheatSheetText(g.name, rows)} filename={fileName} />
                    <PrintButton target={id} label="Imprimir / PDF" />
                  </div>
                </header>

                {/* En el celular cada truco se ve como ficha; en pantalla grande y al imprimir, como tabla */}
                <div data-cheat-cards className="divide-y divide-white/5 sm:hidden">
                  {rows.map((r) => (
                    <div key={r.id} className="space-y-1.5 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <code className="font-mono text-base font-bold break-all text-accent-light">
                          {r.code || "—"}
                        </code>
                        {r.code && <CopyButton text={r.code} label="Copiar" />}
                      </div>
                      {r.purpose && <p className="text-sm font-medium text-zinc-100">{plainCheatText(r.purpose)}</p>}
                      {r.detail && (
                        <p className="text-xs whitespace-pre-line text-zinc-400">{plainCheatText(r.detail)}</p>
                      )}
                    </div>
                  ))}
                </div>

                <table data-cheat-table className="hidden w-full text-left text-sm sm:table">
                  <thead className="text-[11px] tracking-widest text-zinc-500 uppercase">
                    <tr>
                      <th className="w-[28%] px-5 pt-3 pb-1 font-semibold">Código del truco</th>
                      <th className="w-[30%] px-3 pt-3 pb-1 font-semibold">Para qué sirve</th>
                      <th className="px-5 pt-3 pb-1 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((r) => (
                      <tr key={r.id} className="align-top transition hover:bg-white/5">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-[13px] font-bold break-all text-accent-light">
                              {r.code || "—"}
                            </code>
                            {r.code && <CopyButton text={r.code} label="Copiar" className="no-print shrink-0" />}
                          </div>
                          {r.cats.length > 0 && (
                            <div className="mt-1 text-[11px] text-zinc-500">{r.cats.join(" · ")}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-zinc-100">{plainCheatText(r.purpose)}</td>
                        <td className="px-5 py-3 text-zinc-400">
                          <span className="whitespace-pre-line">{plainCheatText(r.detail)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
          <Search className="h-10 w-10 text-zinc-600" />
          <p className="font-display text-xl font-bold text-white uppercase">No encontramos trucos</p>
          <p className="max-w-md text-sm text-zinc-400">
            No hay coincidencias para “<strong className="text-zinc-200">{query}</strong>”
            {cat ? ` en ${cat}` : ""}. Prueba con otra palabra (por ejemplo <em>armas</em> o{" "}
            <em>sin policías</em>) o con otra categoría.
          </p>
          <button type="button" onClick={clear} className="btn-ghost btn-sm mt-1">
            Ver todos los trucos
          </button>
        </div>
      )}
    </div>
  );
}
