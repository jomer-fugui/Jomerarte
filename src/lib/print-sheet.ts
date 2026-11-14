import { plainCheatText, type CheatGame } from "./cheats";

/**
 * Hoja de impresión de los trucos.
 *
 * ¿Por qué un documento aparte y no imprimir la página tal cual? Porque al imprimir la página del sitio el
 * navegador arrastra todo lo demás (menú, buscador, otros juegos ocultos…) y terminaba generando hojas en
 * blanco. Acá se arma un documento limpio, solo con los trucos, y se manda a imprimir ese: entra en las hojas
 * que tiene que entrar y en el diálogo se elige “Guardar como PDF”.
 */

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(html: string): string {
  return esc(plainCheatText(html)).replace(/\n/g, "<br>");
}

const CSS = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 1.4;
    color: #111;
    background: #fff;
  }
  .hint {
    font-size: 10pt;
    background: #fff8d6;
    border: 1px solid #e6d488;
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0 0 8mm;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8mm;
    border-bottom: 2px solid #111;
    padding-bottom: 2mm;
    margin: 0 0 6mm;
  }
  .head h1 { font-size: 15pt; margin: 0; }
  .head .site { font-size: 9pt; color: #555; }
  .game { margin: 0 0 9mm; }
  .game + .game { break-before: page; page-break-before: always; }
  .game h2 { font-size: 13pt; margin: 0 0 1mm; text-transform: uppercase; }
  .game .count { font-size: 9pt; color: #555; margin: 0 0 3mm; }
  .note {
    border-left: 3px solid #888;
    background: #f2f2f2;
    padding: 2.5mm 3mm;
    margin: 0 0 4mm;
    font-size: 10.5pt;
  }
  .note b {
    display: block;
    font-size: 8.5pt;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 1mm;
  }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th {
    text-align: left;
    font-size: 8.5pt;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #444;
    border-bottom: 1px solid #999;
    padding: 0 2mm 1.2mm 0;
  }
  td { vertical-align: top; padding: 2mm 2mm 2mm 0; border-bottom: 1px solid #ddd; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td.code { width: 26%; font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-weight: 700; }
  td.purpose { width: 30%; font-weight: 600; }
  .foot { margin-top: 6mm; border-top: 1px solid #ddd; padding-top: 2mm; font-size: 8.5pt; color: #666; }
  @media print { .hint { display: none; } }
`;

/**
 * Documento imprimible con uno o varios juegos.
 * `only` deja solo ese juego (lo usa el botón “Imprimir / PDF” de cada cuadro).
 */
export function buildCheatSheetHtml(
  games: CheatGame[],
  opts: { title: string; siteName?: string; url?: string; note?: string },
): string {
  const today = new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

  const blocks = games
    .map((g) => {
      const rows = g.rows
        .map(
          (r) => `<tr>
      <td class="code">${esc(r.code)}</td>
      <td class="purpose">${text(r.purpose)}</td>
      <td>${text(r.detail)}</td>
    </tr>`,
        )
        .join("\n    ");
      const note = g.note
        ? `<div class="note"><b>${esc(g.note.purpose || "Cómo se introducen los trucos")}</b>${
            g.note.detail ? text(g.note.detail) : ""
          }</div>`
        : "";
      return `<section class="game">
    <h2>${esc(g.name)}</h2>
    <p class="count">${g.rows.length} ${g.rows.length === 1 ? "truco" : "trucos"}</p>
    ${note}
    <table>
      <thead><tr><th>Código del truco</th><th>Para qué sirve</th><th>Detalle</th></tr></thead>
      <tbody>
    ${rows}
      </tbody>
    </table>
  </section>`;
    })
    .join("\n  ");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<style>${CSS}</style>
</head>
<body>
  <p class="hint">Si el diálogo de impresión no se abrió solo, usá <strong>Ctrl + P</strong> (en el celular: Compartir → Imprimir). Para guardarlo, elegí <strong>Guardar como PDF</strong>.</p>
  <header class="head">
    <h1>${esc(opts.title)}</h1>
    <span class="site">${esc(opts.siteName ?? "")}</span>
  </header>
  ${blocks}
  <p class="foot">${esc(opts.url ?? "")}${opts.note ? ` · ${esc(opts.note)}` : ""} · ${esc(today)}</p>
</body>
</html>`;
}

/**
 * Manda a imprimir un documento aparte. Primero en una pestaña nueva (se ve lo que se va a imprimir y desde
 * ahí también se puede guardar el PDF). Si el navegador bloquea la pestaña, se usa un marco invisible.
 */
export function printDocument(html: string): void {
  const win = window.open("", "_blank");
  if (win) {
    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          // El navegador no deja imprimir solo: queda la pestaña abierta para imprimir a mano.
        }
      }, 350);
      return;
    } catch {
      try {
        win.close();
      } catch {
        // si no se puede cerrar, no pasa nada
      }
    }
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    window.print();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.print();
    }
    setTimeout(() => frame.remove(), 60000);
  }, 350);
}
