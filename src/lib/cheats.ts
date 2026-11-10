import { foldText } from "./format";

export type ParsedCheat = { code: string; purpose: string; detail: string };

/** Cualquier truco con lo mínimo para mostrarlo o buscarlo */
export type CheatLike = { code: string; purpose: string; detail: string; cats: string[] };

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
 */
export function parseCheatRows(text: string, game = ""): ParsedCheat[] {
  const out: ParsedCheat[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
    if (!line) continue;
    let parts = line.split(SEPARATOR).map((p) => p.trim().replace(/^"(.*)"$/, "$1").trim());
    if (!parts[0]) continue;
    if (isHeader(parts)) continue;
    const gameFold = game ? foldText(game) : "";
    if (gameFold && foldText(parts[0]) === gameFold) parts = parts.slice(1);
    else if (parts.length >= 4) parts = parts.slice(1);
    if (!parts[0]) continue;
    const code = parts[0].slice(0, 200);
    const purpose = (parts[1] ?? "").slice(0, 300);
    const detail = parts.slice(2).join(" · ").slice(0, 4000);
    const key = foldText(`${code}|${purpose}`);
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

/**
 * Todo lo que se puede escribir en la lupa: nombre del juego, categorías, código,
 * “para qué sirve” y detalle. Así “armas” o “sin policías” encuentran el truco.
 */
export function cheatSearchText(game: string, row: CheatLike): string {
  return foldText([game, row.cats.join(" "), row.code, row.purpose, row.detail].join(" "));
}

/** Trucos que coinciden con la búsqueda y la categoría elegida. */
export function filterCheatRows(game: string, rows: CheatLike[], query: string, cat: string): CheatLike[] {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  return rows.filter(
    (r) => (!cat || r.cats.includes(cat)) && tokens.every((t) => cheatSearchText(game, r).includes(t)),
  );
}

/** El archivo de texto con todos los trucos de un juego, listo para leer en Windows o Android. */
export function cheatSheetText(game: string, rows: CheatLike[]): string {
  const lines = [game, `Trucos: ${rows.length}`, ""];
  for (const r of rows) {
    lines.push(r.code ? r.code : "(sin código)");
    if (r.purpose) lines.push(`  Para qué sirve: ${plainCheatText(r.purpose)}`);
    if (r.detail) lines.push(`  Detalle: ${plainCheatText(r.detail).replace(/\s*\n\s*/g, " ")}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
