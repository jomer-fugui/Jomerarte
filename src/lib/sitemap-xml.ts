import type { MetadataRoute } from "next";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Convierte las direcciones del sitio en un sitemap.xml válido (con imágenes). */
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
