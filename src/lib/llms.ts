import { isDatabaseConfigured } from "@/db";
import { getItems, getMenuModel, type Item } from "./data";
import { excerpt, itemCategories, waLink } from "./format";
import { safeUrl } from "./links";
import type { MenuEntry } from "./nav";
import type { SectionDef } from "./sections";
import { absUrl, aiPolicyOf, countryInfo, detailPath, hoursText, parseHours, splitList } from "./seo";
import { getSeoContext } from "./seo-server";

/**
 * llms.txt (https://llmstxt.org): un resumen en texto del sitio pensado para los asistentes con IA.
 * /llms.txt tiene el resumen y los enlaces; /llms-full.txt además todas las publicaciones.
 */

const MAX_CHARS = 400_000;

function oneLine(s: string): string {
  return s.replace(/\s*\n+\s*/g, " / ").replace(/\s+/g, " ").trim();
}

function itemBlock(base: string, section: SectionDef, it: Item): string {
  const cats = itemCategories(it);
  switch (section.layout) {
    case "quotes":
      return `- “${oneLine(it.content)}”${cats.length ? ` (${cats.join(", ")})` : ""}`;
    case "colmos":
      return `- **${oneLine(it.title)}** ${oneLine(it.content)}`;
    case "prices":
      return `- ${it.title}${it.subtitle ? ` (${it.subtitle})` : ""}: ${it.price || "Consultar"}${it.unit ? ` / ${it.unit}` : ""}`;
    default:
      break;
  }
  const url = section.detail ? `${base}${detailPath(section.path, it)}` : "";
  const lines: string[] = [`### ${url ? `[${it.title || "Sin título"}](${url})` : it.title || "Sin título"}`];
  if (it.subtitle) lines.push(it.subtitle);
  const facts: string[] = [];
  if (cats.length) facts.push(`Categorías: ${cats.join(", ")}`);
  if (it.price) facts.push(`Precio: ${it.price}${it.unit && section.layout !== "games" ? ` (${it.unit})` : ""}`);
  if (section.layout === "games" && it.unit) facts.push(`Tamaño: ${it.unit}`);
  if (it.rating > 0) facts.push(`Puntuación: ${it.rating} de 5`);
  if (it.location) facts.push(section.layout === "games" ? `Desarrollador: ${it.location}` : `Ubicación: ${it.location}`);
  if (facts.length) lines.push(...facts.map((f) => `- ${f}`));
  const text =
    section.layout === "poems" || section.layout === "songs" ? it.content.trim().slice(0, 3000) : excerpt(it.content, 1200);
  if (text) lines.push("", text);
  const links: string[] = [];
  const main = absUrl(base, safeUrl(it.linkUrl));
  if (main) links.push(`- ${it.linkLabel || "Enlace"}: ${main}`);
  for (const l of it.links ?? []) {
    const u = absUrl(base, safeUrl(l.url));
    if (u) links.push(`- ${l.label || "Enlace"}: ${u}`);
  }
  if (links.length) lines.push("", ...links);
  return lines.join("\n");
}

export async function buildLlmsTxt(full: boolean): Promise<string | null> {
  if (!isDatabaseConfigured()) return "# Sitio en configuración\n";
  const [ctx, menu] = await Promise.all([getSeoContext(), getMenuModel()]);
  const s = ctx.settings;
  if (aiPolicyOf(s.aiPolicy) === "block") return null;
  const base = ctx.base;
  const country = countryInfo(s.country);

  const out: string[] = [`# ${s.siteName}`, ""];
  out.push(`> ${excerpt(s.seoDescription || s.heroText || s.tagline || s.siteName, 500)}`, "");

  const facts: string[] = [];
  if (s.tagline) facts.push(`- Qué ofrece: ${s.tagline}`);
  if (s.ownerName) facts.push(`- Responsable: ${s.ownerName}`);
  const place = [s.city, s.region, country.name].filter(Boolean).join(", ");
  facts.push(`- Ubicación: ${place}`);
  const areas = splitList(s.serviceArea);
  if (areas.length) facts.push(`- Zona de trabajo: ${areas.join(", ")}`);
  const hours = hoursText(parseHours(s.openingHours)) || s.hours;
  if (hours) facts.push(`- Horarios: ${hours}`);
  const wa = waLink(s.whatsapp);
  if (wa) facts.push(`- WhatsApp: ${wa}`);
  if (s.phone) facts.push(`- Teléfono: ${s.phone}`);
  if (s.email) facts.push(`- Email: ${s.email}`);
  if (s.mapsUrl) facts.push(`- Google Maps: ${s.mapsUrl}`);
  if (ctx.sameAs.length) facts.push(`- Redes y perfiles: ${ctx.sameAs.join(" · ")}`);
  facts.push(`- Sitio web: ${base}/`);
  out.push(...facts, "");

  if (s.aboutText.trim()) out.push(`## ${s.aboutTitle || "Sobre nosotros"}`, "", s.aboutText.trim(), "");

  const visibleEntries: MenuEntry[] = [];
  for (const g of menu.groups) {
    const entries = g.entries.filter((e) => e.visible);
    if (entries.length === 0 && !(g.hub && g.hubVisible)) continue;
    out.push(`## ${ctx.isMain ? g.label : "Páginas"}`, "");
    if (g.hub && g.hubVisible) out.push(`- [${g.hub.allLabel}](${base}${g.hub.path})`);
    for (const e of entries) {
      out.push(`- [${e.title}](${base}${e.path})${e.intro ? `: ${excerpt(e.intro, 200)}` : ""}`);
      visibleEntries.push(e);
    }
    out.push("");
  }

  if (!full) {
    out.push(
      "## Optional",
      "",
      `- [Todo el contenido en texto](${base}/llms-full.txt): publicaciones con precios, categorías y enlaces`,
      `- [Mapa del sitio](${base}/sitemap.xml)`,
      `- [Buscador del sitio](${base}/buscar?q=): agrega la búsqueda después de q=`,
      "",
    );
    return out.join("\n");
  }

  out.push("---", "", "# Contenido completo", "");
  let size = out.join("\n").length;
  let truncated = false;
  for (const e of visibleEntries) {
    if (size > MAX_CHARS) {
      truncated = true;
      break;
    }
    const block: string[] = [`## ${e.title}`, "", `Página: ${base}${e.path}`];
    if (e.intro) block.push("", excerpt(e.intro, 600));
    if (e.def) {
      const list = await getItems(e.def.key);
      if (list.length) block.push("", ...list.map((it) => itemBlock(base, e.def as SectionDef, it)));
    }
    const page = e.custom?.item;
    if (page?.content.trim()) block.push("", excerpt(page.content, 4000));
    const text = block.join("\n\n").replace(/\n{3,}/g, "\n\n");
    out.push(text, "");
    size += text.length;
  }
  if (truncated) out.push(`(El contenido continúa en ${base}/sitemap.xml)`, "");
  return out.join("\n");
}
