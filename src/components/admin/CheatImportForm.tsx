"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Info } from "lucide-react";
import { importCheatsAction, type FormState } from "@/app/admin/actions";
import { parseCheatRows } from "@/lib/cheats";
import { cn } from "@/lib/format";
import { SubmitButton } from "./SubmitButton";

const EXAMPLE = `LXGIWYL; Pack de armas 1; bate, pistola, escopeta, MP5, AK-47, rifle, ametralladora, lanzamisiles y spray.
KJKSZPJ; Pack de armas 2; cuchillo, desert eagle, escopeta recortada, uzi, M4, francotirador y lanzacohetes.
AEZAKMI; Sin policías; quita la búsqueda de la policía hasta que lo desactives.
HESOYAM; Salud, chaleco y dinero; vida y chaleco al máximo y $250.000.`;

/**
 * Carga de trucos en bloque: primero se elige el juego, después se pega la lista
 * con una línea por truco (código; para qué sirve; detalle).
 */
export function CheatImportForm({
  sectionKey,
  site,
  games,
  categories,
}: {
  sectionKey: string;
  site: string;
  games: string[];
  categories: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(importCheatsAction, null);
  const [game, setGame] = useState("");
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState("");
  const parsed = useMemo(() => parseCheatRows(rows, game), [rows, game]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="section" value={sectionKey} />
      <input type="hidden" name="__site" value={site} />

      {state?.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{state.error}</div>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">1. ¿De qué juego son?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="game">
              Nombre del juego
            </label>
            <input
              id="game"
              name="game"
              list="juegos-cargados"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="GTA San Andreas (PC)"
              className="input"
            />
            <datalist id="juegos-cargados">
              {games.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <p className="mt-1.5 text-xs text-zinc-500">
              Elegí uno que ya exista o escribí uno nuevo. Tiene que ser igual al de los otros trucos del mismo juego
              (así se agrupan en la misma tabla).
            </p>
          </div>
          <div>
            <label className="label" htmlFor="category">
              Categoría para todos (opcional)
            </label>
            <input
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Armas, vehículos, dinero…"
              className="input"
            />
            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? "" : c)}
                    className={cn("chip hover:border-white/30", category === c && "chip-active")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">2. Pegá los trucos</h2>
          <button type="button" onClick={() => setRows(EXAMPLE)} className="btn-ghost btn-sm">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Usar ejemplo
          </button>
        </div>
        <textarea
          name="rows"
          rows={12}
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          placeholder={"LXGIWYL; Pack de armas 1; bate, pistola, escopeta, MP5…\nAEZAKMI; Sin policías; quita la búsqueda de la policía."}
          className="input font-mono text-[13px] leading-relaxed"
        />
        <p className="text-xs text-zinc-500">
          Una línea por truco: <code className="text-zinc-300">código; para qué sirve; detalle</code>. También podés
          pegar las tres columnas de Excel (separadas por tabulación) o usar <code className="text-zinc-300">|</code>.
          Las líneas repetidas y el encabezado de la planilla se saltean solos.
        </p>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-semibold text-white">
            {parsed.length === 0
              ? "Todavía no hay trucos para cargar"
              : `${parsed.length} ${parsed.length === 1 ? "truco listo" : "trucos listos"} para guardar`}
            {game.trim() && parsed.length > 0 && <span className="text-zinc-400"> en “{game.trim()}”</span>}
          </p>
          {parsed.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {parsed.slice(0, 5).map((r, i) => (
                <li key={`${r.code}-${i}`} className="flex flex-wrap gap-x-2">
                  <code className="font-mono text-accent-light">{r.code || "—"}</code>
                  <span className="text-zinc-400">{r.purpose || "(sin “para qué sirve”)"}</span>
                </li>
              ))}
              {parsed.length > 5 && <li className="text-zinc-500">y {parsed.length - 5} más…</li>}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Guardando trucos…">
          {parsed.length > 0 ? `Guardar ${parsed.length} ${parsed.length === 1 ? "truco" : "trucos"}` : "Guardar trucos"}
        </SubmitButton>
        <Link href={`/admin/s/${sectionKey}`} className="btn-ghost">
          Volver a la lista
        </Link>
        <span className="text-xs text-zinc-500">
          <Info className="mr-1 inline h-3.5 w-3.5" />
          Los trucos se agregan al final, sin borrar los que ya están cargados.
        </span>
      </div>
    </form>
  );
}
