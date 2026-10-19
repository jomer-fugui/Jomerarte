"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Form from "next/form";
import { Search, X } from "lucide-react";

/** Botón de la lupa: abre un buscador que busca en todas las páginas del sitio actual. */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-white/30 xl:ml-2"
        aria-label="Buscar en el sitio"
        title="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Buscar en el sitio">
            <button type="button" className="absolute inset-0 bg-black/75" aria-label="Cerrar buscador" onClick={() => setOpen(false)} />
            <div className="relative mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black sm:mt-20">
              <Form action="/buscar" onSubmit={() => setOpen(false)} className="flex items-center gap-2">
                <Search className="ml-2 h-5 w-5 shrink-0 text-zinc-500" />
                <input
                  name="q"
                  type="search"
                  required
                  autoFocus
                  enterKeyHint="search"
                  placeholder="Buscar por nombre o categoría…"
                  aria-label="Buscar"
                  className="min-w-0 flex-1 bg-transparent py-3 text-lg text-white placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                <button type="submit" className="btn-primary shrink-0">
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </Form>
              <p className="px-2 pt-1 pb-1 text-xs text-zinc-500">Busca juegos, productos, frases y más por su nombre o categoría.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
