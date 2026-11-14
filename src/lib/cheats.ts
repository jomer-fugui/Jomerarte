import { foldText } from "./format";

export type ParsedCheat = { code: string; purpose: string; detail: string };

/** Cualquier truco con lo mínimo para mostrarlo o buscarlo */
export type CheatLike = { code: string; purpose: string; detail: string; cats: string[] };

/** Un truco ya listo para mostrar (sin datos internos de la base) */
export type CheatRow = CheatLike & { id: number };

/** La explicación de cómo se introducen los trucos de un juego (el truco cargado sin código). */
export type CheatNote = { purpose: string; detail: string };

/** Todos los trucos de un juego, con su explicación */
export type CheatGame = { name: string; note: CheatNote | null; rows: CheatRow[] };

/** Separadores aceptados: tabulación (pegado desde Excel), punto y coma o barra vertical. */
const SEPARATOR = /\t|;|\|/;

/** La primera línea suele ser el encabezado de la planilla: no es un truco. */
function isHeader(parts: string[]): boolean {
  const all = foldText(parts.join(" "));
  return all.includes("sirve") && (all.includes("codigo") || all.includes("juego"));
}

/**
 * Lee el texto pegado (de Excel o escrito a mano) con una línea por truco:
 *   código ; para qué sirve ; detalle
 * El detalle puede tener comas y puntos sin problema: solo se corta por los separadores de arriba.
 * Si la planilla trae la columna del juego adelante (como en el ejemplo del cuadro), se ignora:
 * el juego es el que se elige en el formulario (`game`).
 * Una línea SIN código es la explicación de cómo se introducen los trucos del juego.
 */
export function parseCheatRows(text: string, game = ""): ParsedCheat[] {
  const out: ParsedCheat[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
    if (!line) continue;
    let parts = line.split(SEPARATOR).map((p) => p.trim().replace(/^"(.*)"$/, "$1").trim());
    if (isHeader(parts)) continue;
    const gameFold = game ? foldText(game) : "";
    if (gameFold && foldText(parts[0]) === gameFold) parts = parts.slice(1);
    else if (parts.length >= 4) parts = parts.slice(1);
    const code = (parts[0] ?? "").slice(0, 200);
    const purpose = (parts[1] ?? "").slice(0, 300);
    const detail = parts.slice(2).join(" · ").slice(0, 4000);
    if (!code && !purpose && !detail) continue;
    const key = foldText(`${code}|${purpose}|${code ? "" : detail}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code, purpose, detail });
  }
  return out;
}

/** Saca las marcas de formato para que el texto se lea limpio en la tabla y en el archivo. */
export function plainCheatText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

/** Arma la explicación del juego juntando las líneas cargadas sin código. */
export function buildNote(purposes: string[], details: string[]): CheatNote | null {
  const purpose = purposes.map((p) => p.trim()).filter(Boolean).join(" · ");
  const detail = details.map((d) => d.trim()).filter(Boolean).join("\n\n");
  return purpose || detail ? { purpose, detail } : null;
}

/**
 * Todo lo que se puede escribir en la lupa: nombre del juego, categorías, código,
 * “para qué sirve”, detalle y la explicación del juego. Así “armas” o “sin policías” encuentran el truco.
 */
export function cheatSearchText(game: string, row: CheatLike, note: CheatNote | null = null): string {
  return foldText(
    [game, row.cats.join(" "), row.code, row.purpose, row.detail, note?.purpose ?? "", note?.detail ?? ""].join(" "),
  );
}

/** Trucos que coinciden con la búsqueda y la categoría elegida. */
export function filterCheatRows(game: string, rows: CheatLike[], query: string, cat: string, note: CheatNote | null = null): CheatLike[] {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  return rows.filter(
    (r) => (!cat || r.cats.includes(cat)) && tokens.every((t) => cheatSearchText(game, r, note).includes(t)),
  );
}

/** El archivo de texto con todos los trucos de un juego, listo para leer en Windows o Android. */
export function cheatSheetText(game: string, rows: CheatLike[], note: CheatNote | null = null): string {
  const lines = [game, `Trucos: ${rows.length}`, ""];
  if (note) {
    if (note.purpose) lines.push(plainCheatText(note.purpose));
    if (note.detail) lines.push(plainCheatText(note.detail));
    lines.push("");
  }
  for (const r of rows) {
    lines.push(r.code ? r.code : "(sin código)");
    if (r.purpose) lines.push(`  Para qué sirve: ${plainCheatText(r.purpose)}`);
    if (r.detail) lines.push(`  Detalle: ${plainCheatText(r.detail).replace(/\s*\n\s*/g, " ")}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
