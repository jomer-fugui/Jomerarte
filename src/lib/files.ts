import { foldText } from "./format";
import { plainCheatText } from "./cheats";

export type ParsedFile = { name: string; detail: string };

/** Un archivo de la lista, listo para mostrar */
export type FileRow = { id: number; name: string; detail: string; cats: string[] };

/** Una lista (o grupo) de archivos: el nombre de la lista viene en el título de cada elemento. */
export type FileGroup = { name: string; rows: FileRow[] };

/** Separadores aceptados: tabulación (pegado desde Excel), punto y coma o barra vertical. */
const SEPARATOR = /\t|;|\|/;

/** La primera línea suele ser el encabezado de la planilla: no es un archivo. */
function isHeader(parts: string[]): boolean {
  const all = foldText(parts.join(" "));
  return all.includes("detalle") && (all.includes("nombre") || all.includes("archivo") || all.includes("lista"));
}

function cellsOf(line: string): string[] {
  return line.split(SEPARATOR).map((p) => p.trim().replace(/^"(.*)"$/, "$1").trim());
}

/**
 * Lee el texto pegado (de Excel o escrito a mano) con una línea por archivo:
 *   nombre ; detalle
 * Si la planilla trae una columna con el nombre de la lista adelante (repetida en todas las líneas),
 * se ignora: la lista es la que se elige en el formulario (`group`).
 */
export function parseFileRows(text: string, group = ""): ParsedFile[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .filter((l) => !isHeader(cellsOf(l)));

  const cells = lines.map(cellsOf);
  const groupFold = group ? foldText(group) : "";
  // Columna repetida con el mismo texto en todas las líneas = columna de la lista (viene de Excel)
  const repeatedFirst =
    cells.length > 0 &&
    cells.every((c) => c.length >= 3) &&
    cells.every((c) => foldText(c[0]) === foldText(cells[0][0]));

  const out: ParsedFile[] = [];
  const seen = new Set<string>();
  for (const row of cells) {
    let parts = row;
    if (parts.length > 1 && groupFold && foldText(parts[0]) === groupFold) parts = parts.slice(1);
    else if (repeatedFirst) parts = parts.slice(1);
    const name = (parts[0] ?? "").slice(0, 300);
    const detail = parts.slice(1).join(" · ").slice(0, 4000);
    if (!name) continue;
    const key = foldText(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, detail });
  }
  return out;
}

/** Todo lo que se puede escribir en la lupa: lista, categorías, nombre y detalle. */
export function fileSearchText(group: string, row: { name: string; detail: string; cats: string[] }): string {
  return foldText([group, row.cats.join(" "), row.name, row.detail].join(" "));
}

/** La lista completa como archivo de texto, lista para leer en Windows o Android. */
export function fileListText(group: string, rows: { name: string; detail: string }[]): string {
  const lines = [group, `Archivos: ${rows.length}`, ""];
  for (const r of rows) {
    lines.push(r.name);
    if (r.detail) lines.push(`  Detalle: ${plainCheatText(r.detail).replace(/\s*\n\s*/g, " ")}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
