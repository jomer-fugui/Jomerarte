import type { MetadataRoute } from "next";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items } from "@/db/schema";
import { getMenuModel } from "./data";
import { mediaKind } from "./format";
import type { SectionDef } from "./sections";
import { absUrl, detailPath } from "./seo";
import { getBaseUrl } from "./seo-server";
import { getCurrentSite } from "./site";

/** Direcciones del sitio actual para el sitemap (y para avisar a los buscadores), con fechas e imágenes. */
export async function sitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [site, base, menu] = await Promise.all([getCurrentSite(), getBaseUrl(), getMenuModel()]);
  const newest = new Map<string, Date>();
  let overall: Date | undefined;
  if (isDatabaseConfigured()) {
    const rows = await db
      .select({ section: items.section, at: sql<string>`max(${items.updatedAt})` })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.published, true)))
      .groupBy(items.section);
    for (const r of rows) {
      const d = new Date(r.at);
      if (Number.isNaN(d.getTime())) continue;
      newest.set(r.section, d);
      if (!overall || d > overall) overall = d;
    }
  }
  const latest = (dates: (Date | undefined)[]) =>
    dates.reduce<Date | undefined>((m, d) => (d && (!m || d > m) ? d : m), undefined);

  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, lastModified: overall, changeFrequency: "weekly", priority: 1 }];
  const detailSections = new Map<string, SectionDef>();
  for (const g of menu.groups) {
    const visible = g.entries.filter((e) => e.visible);
    if (g.hub && g.hubVisible) {
      entries.push({
        url: `${base}${g.hub.path}`,
        lastModified: latest(visible.map((e) => (e.def ? newest.get(e.def.key) : undefined))),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
    for (const e of visible) {
      entries.push({
        url: `${base}${e.path}`,
        lastModified: (e.def ? newest.get(e.def.key) : undefined) ?? e.custom?.item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
      if (e.def?.detail) detailSections.set(e.def.key, e.def);
    }
  }

  if (detailSections.size > 0 && isDatabaseConfigured()) {
    const rows = await db
      .select({ id: items.id, title: items.title, section: items.section, imageUrl: items.imageUrl, gallery: items.gallery, updatedAt: items.updatedAt })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.published, true), inArray(items.section, [...detailSections.keys()])));
    for (const r of rows) {
      const section = detailSections.get(r.section);
      if (!section) continue;
      const images = [r.imageUrl, ...(r.gallery ?? []).filter((g) => mediaKind(g) === "image")]
        .map((u) => absUrl(base, u))
        .filter((u): u is string => Boolean(u))
        .slice(0, 5);
      entries.push({
        url: `${base}${detailPath(section.path, r)}`,
        lastModified: r.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
        ...(images.length ? { images } : {}),
      });
    }
  }
  return entries;
}
