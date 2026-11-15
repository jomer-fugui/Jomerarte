"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Printer, Search, X } from "lucide-react";
import { cn, foldText, slugify } from "@/lib/format";
import { fileListText, fileSearchText, type FileGroup } from "@/lib/files";
import { plainCheatText } from "@/lib/cheats";
import { buildFileSheetHtml, printDocument } from "@/lib/print-sheet";
import { CopyButton, DownloadTextButton } from "../client";
import { currentUrlSearch, subscribeToUrl } from "../FilterableList";

type Cat = { name: string; count: number };

/** Botón de imprimir: arma una hoja aparte con las listas indicadas y la manda a imprimir. */
function PrintSheetButton({
  groups,
  title,
  siteName,
  label,
}: {
  groups: FileGroup[];
  title: string;
  siteName: string;
  label: string;
}) {
  function print() {
    const html = buildFileSheetHtml(groups, {
      title,
      siteName,
      url: `${window.location.origin}${window.location.pathname}`,
    });
    printDocument(html);
  }
  return (
    <button type="button" onClick={print} className="btn-ghost btn-sm no-print">
      <Printer className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/**
 * Lista de archivos: un cuadro desplegable por lista (o carpeta) con buscador.
 * Sin desplegar se ve el nombre de la lista y cuántos archivos tiene; al abrirla, la tabla con el
 * nombre de cada archivo y su detalle, con botón para copiar el nombre y para descargar la lista completa.
 */
export function FileLists({
  groups,
  categories,
  siteName,
  pageTitle,
  initialQuery = "",
  initialCat = "",
  placeholder = "Buscar archivo o lista… (ej: GTA, Linux, iso)",
}: {
  groups: FileGroup[];
  categories: Cat[];
  siteName: string;
  pageTitle: string;
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

  /** Cada archivo con el texto donde se busca: lista, categorías, nombre y detalle. */
  const indexed = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        rows: g.rows.map((r) => ({ row: r, search: fileSearchText(g.name, r) })),
      })),
    [groups],
  );

  const visible = useMemo(
    () =>
      indexed
        .map((g) => ({
          group: g.group,
          rows: g.rows.filter((x) => (!cat || x.row.cats.includes(cat)) && tokens.every((t) => x.search.includes(t))),
        }))
        .filter((g) => g.rows.length > 0),
    [indexed, cat, tokens],
  );

  const totalRows = groups.reduce((n, g) => n + g.rows.length, 0);
  const shownRows = visible.reduce((n, g) => n + g.rows.length, 0);
  const filtering = tokens.length > 0 || cat !== "";
  const clear = () => setTyped({ query: "", cat: "" });

  // Las listas arrancan cerradas; con una búsqueda o categoría activa se abren solas.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (name: string) => open[name] ?? filtering;
  const toggle = (name: string) => setOpen((prev) => ({ ...prev, [name]: !isOpen(name) }));

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
          <PrintSheetButton groups={groups} title={pageTitle} siteName={siteName} label="Imprimir todo / PDF" />
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
              ? `${shownRows} de ${totalRows} archivos · ${visible.length} ${visible.length === 1 ? "lista" : "listas"}`
              : `${totalRows} archivos · ${groups.length} ${groups.length === 1 ? "lista" : "listas"}`}
          {visible.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const g of visible) next[g.group.name] = !visible.every((x) => isOpen(x.group.name));
                setOpen(next);
              }}
              className="font-semibold text-accent-light hover:text-white"
            >
              {visible.every((g) => isOpen(g.group.name)) ? "Cerrar todas" : "Abrir todas"}
            </button>
          )}
          {filtering && (
            <button type="button" onClick={clear} className="font-semibold text-accent-light hover:text-white">
              Limpiar filtros
            </button>
          )}
        </p>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-4">
          {visible.map(({ group, rows: found }) => {
            const rows = found.map((x) => x.row);
            const panelId = `archivos-${slugify(group.name) || "lista"}`;
            const fileName = `${(slugify(group.name) || "archivos").toLowerCase()}.txt`;
            const names = rows.map((r) => r.name).join("\n");
            const open2 = isOpen(group.name);
            return (
              <section key={group.name} className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                  <button
                    type="button"
                    onClick={() => toggle(group.name)}
                    aria-expanded={open2}
                    aria-controls={panelId}
                    className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "mt-1.5 h-5 w-5 shrink-0 text-zinc-400 transition group-hover:text-white",
                        open2 && "rotate-180",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-xl font-bold tracking-wide text-white uppercase">
                          {group.name}
                        </span>
                        <span className="text-sm font-semibold text-zinc-400">
                          {rows.length} {rows.length === 1 ? "archivo" : "archivos"}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-zinc-500">
                        {open2 ? "Tocá para cerrar la lista" : "Tocá para ver los archivos"}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-2 no-print sm:justify-end">
                    {names && <CopyButton text={names} label="Copiar nombres" />}
                    <DownloadTextButton text={fileListText(group.name, rows)} filename={fileName} />
                    <PrintSheetButton
                      groups={[{ name: group.name, rows }]}
                      title={`${group.name} — Archivos`}
                      siteName={siteName}
                      label="Imprimir / PDF"
                    />
                  </div>
                </div>

                {open2 && (
                  <div id={panelId}>
                    {/* En el celular cada archivo se ve como ficha; en pantalla grande, como tabla */}
                    <div className="divide-y divide-white/5 sm:hidden">
                      {rows.map((r) => (
                        <div key={r.id} className="space-y-1.5 px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 font-mono text-sm font-bold break-all text-accent-light">
                              {r.name}
                            </span>
                            <CopyButton text={r.name} label="Copiar" />
                          </div>
                          {r.detail && <p className="text-xs whitespace-pre-line text-zinc-400">{plainCheatText(r.detail)}</p>}
                        </div>
                      ))}
                    </div>

                    <table className="hidden w-full text-left text-sm sm:table">
                      <thead className="text-[11px] tracking-widest text-zinc-500 uppercase">
                        <tr>
                          <th className="w-[45%] px-5 pt-3 pb-1 font-semibold">Nombre</th>
                          <th className="px-5 pt-3 pb-1 font-semibold">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {rows.map((r) => (
                          <tr key={r.id} className="align-top transition hover:bg-white/5">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="min-w-0 font-mono text-[13px] font-bold break-all text-accent-light">
                                  {r.name}
                                </span>
                                <CopyButton text={r.name} label="Copiar" className="no-print shrink-0" />
                              </div>
                              {r.cats.length > 0 && (
                                <div className="mt-1 text-[11px] text-zinc-500">{r.cats.join(" · ")}</div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-zinc-400">
                              <span className="whitespace-pre-line">{plainCheatText(r.detail)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
          <Search className="h-10 w-10 text-zinc-600" />
          <p className="font-display text-xl font-bold text-white uppercase">No encontramos archivos</p>
          <p className="max-w-md text-sm text-zinc-400">
            No hay coincidencias para “<strong className="text-zinc-200">{query}</strong>”
            {cat ? ` en ${cat}` : ""}. Prueba con otra palabra o con otra categoría.
          </p>
          <button type="button" onClick={clear} className="btn-ghost btn-sm mt-1">
            Ver todas las listas
          </button>
        </div>
      )}
    </div>
  );
}
