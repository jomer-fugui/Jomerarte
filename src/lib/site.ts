import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items, settings, sites } from "@/db/schema";
import { isAdmin } from "./auth";
import { DEFAULT_SETTINGS } from "./defaults";
import { subdomainCandidate } from "./hosts";
import { ensureSeeded } from "./seed";

/** Cookie con el sitio que el administrador está editando desde el dominio principal. */
export const SITE_COOKIE = "jomer_sitio";

export type SiteContext = {
  /** "" = sitio principal; si no, el subdominio (ej: "juegos") */
  slug: string;
  isMain: boolean;
  /** host: elegido por el dominio · preview: el administrador lo eligió en el panel · main: sitio principal */
  via: "host" | "preview" | "main";
  /** Dominio con el que se abrió la página (puede incluir el puerto) */
  host: string;
};

export async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
}

/** Subdominios creados (sin contar el sitio principal). */
export const getSiteSlugs = cache(async (): Promise<string[]> => {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureSeeded();
    const rows = await db.select({ slug: sites.slug }).from(sites).orderBy(asc(sites.createdAt));
    return rows.map((r) => r.slug);
  } catch (err) {
    console.error("[sites]", err instanceof Error ? err.message : err);
    return [];
  }
});

/**
 * Sitio que corresponde a esta visita:
 *  1. Por el dominio: juegos.jomerarte.com → "juegos" (si existe ese subdominio).
 *  2. En el dominio principal, el administrador puede ver y editar otro sitio (vista previa).
 *  3. Si no, el sitio principal.
 */
export const getCurrentSite = cache(async (): Promise<SiteContext> => {
  const host = await requestHost();
  const slugs = await getSiteSlugs();
  const sub = subdomainCandidate(host);
  if (sub && slugs.includes(sub)) return { slug: sub, isMain: false, via: "host", host };
  if (slugs.length > 0) {
    const chosen = (await cookies()).get(SITE_COOKIE)?.value ?? "";
    if (chosen && slugs.includes(chosen) && (await isAdmin())) {
      return { slug: chosen, isMain: false, via: "preview", host };
    }
  }
  return { slug: "", isMain: true, via: "main", host };
});

export type SiteOverview = { slug: string; name: string; pages: number };

/** Lista de sitios para el panel: el principal y todos los subdominios. */
export async function getSitesOverview(): Promise<SiteOverview[]> {
  if (!isDatabaseConfigured()) return [{ slug: "", name: DEFAULT_SETTINGS.siteName, pages: 0 }];
  await ensureSeeded();
  const list = await db.select({ slug: sites.slug }).from(sites).orderBy(asc(sites.createdAt));
  const slugs = ["", ...list.map((s) => s.slug)];
  const [names, counts] = await Promise.all([
    db
      .select({ site: settings.site, value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, "siteName"), inArray(settings.site, slugs))),
    db
      .select({ site: items.site, n: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.section, "custom"))
      .groupBy(items.site),
  ]);
  const nameOf = new Map(names.map((r) => [r.site, r.value] as const));
  const countOf = new Map(counts.map((r) => [r.site, Number(r.n)] as const));
  return slugs.map((slug) => ({
    slug,
    name: nameOf.get(slug) || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : DEFAULT_SETTINGS.siteName),
    pages: countOf.get(slug) ?? 0,
  }));
}
