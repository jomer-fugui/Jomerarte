"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Info } from "lucide-react";
import { importListAction, type FormState } from "@/app/admin/actions";
import { parseCheatRows } from "@/lib/cheats";
import { parseFileRows } from "@/lib/files";
import { cn } from "@/lib/format";
import { SubmitButton } from "./SubmitButton";

const EXAMPLES = {
  cheats: `; Cómo se introducen los trucos; los códigos deben teclearse en la pantalla de inicio del juego, justo donde aparece el texto "Haz clic para continuar".
LXGIWYL; Pack de armas 1; bate, pistola, escopeta, MP5, AK-47, rifle, ametralladora, lanzamisiles y spray.
AEZAKMI; Sin policías; quita la búsqueda de la policía hasta que lo desactives.`,
  files: `GTA Vice City; juego de mundo abierto con misiones
GTA San Andreas; juego de mundo abierto con misiones y más de 200 trucos
Need for Speed Carbono; juego de carreras callejeras`,
};

/**
 * Carga en bloque: primero se elige el juego (o la lista), después se pega el contenido con una línea por
 * truco (código; para qué sirve; detalle) o por archivo (nombre; detalle).
 */
export function ListImportForm({
  kind,
  sectionKey,
  site,
  groups,
  categories,
}: {
  kind: "cheats" | "files";
  sectionKey: string;
  site: string;
  groups: string[];
  categories: string[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(importListAction, null);
  const [group, setGroup] = useState("");
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState("");
  const isCheats = kind === "cheats";
  const parsed = useMemo(
    () => (isCheats ? parseCheatRows(rows, group) : parseFileRows(rows, group)),
    [rows, group, isCheats],
  );

  const what = isCheats ? "truco" : "archivo";
  const groupLabel = isCheats ? "Nombre del juego" : "Nombre de la lista";
  const rowsLabel = isCheats ? "Pegá los trucos" : "Pegá los archivos";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="section" value={sectionKey} />
      <input type="hidden" name="__site" value={site} />

      {state?.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{state.error}</div>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">
          1. ¿{isCheats ? "De qué juego son?" : "Para qué lista son?"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="game">
              {groupLabel}
            </label>
            <input
              id="game"
              name="game"
              list="listas-cargadas"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder={isCheats ? "GTA San Andreas (PC)" : "Lista de juegos para Windows"}
              className="input"
            />
            <datalist id="listas-cargadas">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <p className="mt-1.5 text-xs text-zinc-500">
              Elegí uno que ya exista o escribí uno nuevo. Tiene que ser igual al de los otros {what}s de{" "}
              {isCheats ? "ese juego" : "esa lista"} (así se agrupan en la misma tabla).
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
              placeholder={isCheats ? "Armas, vehículos, dinero…" : "Juegos, programas, sistema operativo…"}
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
          <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">2. {rowsLabel}</h2>
          <button type="button" onClick={() => setRows(EXAMPLES[kind])} className="btn-ghost btn-sm">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Usar ejemplo
          </button>
        </div>
        <textarea
          name="rows"
          rows={12}
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          placeholder={
            isCheats
              ? "LXGIWYL; Pack de armas 1; bate, pistola, escopeta, MP5…\nAEZAKMI; Sin policías; quita la búsqueda de la policía."
              : "GTA Vice City; juego de mundo abierto con misiones\nLinux; sistema operativo de código abierto"
          }
          className="input font-mono text-[13px] leading-relaxed"
        />
        <p className="text-xs text-zinc-500">
          Una línea por {what}:{" "}
          <code className="text-zinc-300">{isCheats ? "código; para qué sirve; detalle" : "nombre; detalle"}</code>.
          {isCheats && (
            <>
              {" "}
              Si empezás la línea con <code className="text-zinc-300">;</code> (sin código), ese texto es la{" "}
              <strong>explicación de cómo se introducen los trucos</strong> y aparece en el encabezado del juego.
            </>
          )}{" "}
          También podés pegar las columnas de Excel tal cual (separadas por tabulación) o usar{" "}
          <code className="text-zinc-300">|</code>. Las líneas repetidas y el encabezado se saltean solos.
        </p>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-semibold text-white">
            {parsed.length === 0
              ? `Todavía no hay ${what}s para cargar`
              : `${parsed.length} ${parsed.length === 1 ? `${what} listo` : `${what}s listos`} para guardar`}
            {group.trim() && parsed.length > 0 && <span className="text-zinc-400"> en “{group.trim()}”</span>}
          </p>
          {parsed.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {parsed.slice(0, 5).map((r, i) => {
                const first = "code" in r ? r.code : r.name;
                const second = "code" in r ? r.purpose : r.detail;
                return (
                  <li key={`${first}-${i}`} className="flex flex-wrap gap-x-2">
                    <code className="font-mono text-accent-light">
                      {isCheats ? first || "(explicación)" : first}
                    </code>
                    <span className="text-zinc-400 truncate">{second || (isCheats ? "(sin “para qué sirve”)" : "")}</span>
                  </li>
                );
              })}
              {parsed.length > 5 && <li className="text-zinc-500">y {parsed.length - 5} más…</li>}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={`Guardando ${what}s…`}>
          {parsed.length > 0 ? `Guardar ${parsed.length} ${what}s` : `Guardar ${what}s`}
        </SubmitButton>
        <Link href={`/admin/s/${sectionKey}`} className="btn-ghost">
          Volver a la lista
        </Link>
        <span className="text-xs text-zinc-500">
          <Info className="mr-1 inline h-3.5 w-3.5" />
          Se agregan al final, sin borrar los que ya están cargados.
        </span>
      </div>
    </form>
  );
}
