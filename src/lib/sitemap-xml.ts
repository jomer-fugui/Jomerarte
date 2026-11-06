import type { MetadataRoute } from "next";

/**
 * Caracteres que el XML 1.0 no admite de ninguna forma (los de control, salvo tabulador y saltos
 * de línea, y los dos "no caracteres" del final). Si se cuelan —por ejemplo, en una dirección de
 * imagen pegada a mano en el panel— el archivo entero deja de ser válido y los buscadores no
 * pueden leer el sitemap. Se borran.
 */
const FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]/g;

/**
 * Deja un texto listo para meter dentro del XML: primero saca lo que no puede existir y después
 * escapa lo que sí existe pero tiene significado (&, <, >, comillas).
 *
 * El `&` es el que más rompe: las fotos de productos y de redes sociales vienen con direcciones
 * del tipo `...foto.jpg?stp=dst-jpg&cstp=mx460x215`, y un `&` suelto invalida todo el archivo.
 */
function esc(s: string): string {
  return s
    .replace(FORBIDDEN, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convierte las direcciones del sitio en un sitemap.xml válido (con imágenes).
 *
 * El orden de los elementos NO es libre: el esquema oficial pide `loc`, `lastmod`, `changefreq`,
 * `priority` y recién después las extensiones de imagen. Por eso las imágenes van al final.
 */
export function sitemapToXml(entries: MetadataRoute.Sitemap): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const e of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${esc(e.url)}</loc>`);
    if (e.lastModified) {
      const d = e.lastModified instanceof Date ? e.lastModified : new Date(e.lastModified as string);
      if (!Number.isNaN(d.getTime())) lines.push(`    <lastmod>${d.toISOString()}</lastmod>`);
    }
    if (e.changeFrequency) lines.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
    if (typeof e.priority === "number") lines.push(`    <priority>${e.priority}</priority>`);
    for (const img of e.images ?? []) lines.push(`    <image:image><image:loc>${esc(img)}</image:loc></image:image>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>", "");
  return lines.join("\n");
}
