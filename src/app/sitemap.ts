import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items } from "@/db/schema";
import { getCustomSections, getPageTexts } from "@/lib/data";
import { slugify } from "@/lib/format";
import { ALL_PAGE_DEFS, SECTIONS, type SectionDef } from "@/lib/sections";
import { siteBaseUrl } from "@/lib/hosts";
import { getCurrentSite, type SiteContext } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Dirección base del sitio que se está consultando (el principal o un subdominio). */
function baseUrlFor(site: SiteContext): string {
  if (!site.isMain) return `https://${site.host}`;
  return siteBaseUrl() ?? (site.host ? `https://${site.host}` : "https://jomerarte.com");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getCurrentSite();
  const base = baseUrlFor(site);
  const [pages, customs] = await Promise.all([getPageTexts(), getCustomSections()]);
  const visibleCustoms = customs.filter((c) => c.visible);
  const entries: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "weekly", priority: 1 }];

  if (site.isMain) {
    for (const def of ALL_PAGE_DEFS) {
      if (def.key === "custom" || pages[def.key]?.visible === false) continue;
      entries.push({ url: base + def.path, changeFrequency: "weekly", priority: 0.8 });
    }
  }
  for (const c of visibleCustoms) {
    entries.push({ url: base + c.path, lastModified: c.item.updatedAt, changeFrequency: "weekly", priority: 0.7 });
  }
  if (!isDatabaseConfigured()) return entries;

  const defs = new Map<string, SectionDef>();
  if (site.isMain) for (const s of SECTIONS) defs.set(s.key, s);
  for (const c of visibleCustoms) if (c.def) defs.set(c.key, c.def);

  try {
    const rows = await db
      .select({ id: items.id, title: items.title, section: items.section, updatedAt: items.updatedAt })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.published, true)));
    for (const r of rows) {
      const s = defs.get(r.section);
      if (!s?.detail || pages[s.key]?.visible === false) continue;
      entries.push({
        url: `${base}${s.path}/${r.id}-${slugify(r.title) || "ver"}`,
        lastModified: r.updatedAt,
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[sitemap]", err instanceof Error ? err.message : err);
  }
  return entries;
}
