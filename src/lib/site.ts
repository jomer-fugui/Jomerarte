import { cache } from "react";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items, settings, sites } from "@/db/schema";
import { isAdmin } from "./auth";
import { subdomainCandidate } from "./hosts";
import { DEFAULT_SETTINGS } from "./defaults";
import { ensureSeeded } from "./seed";
import { TAG_CONTENT, TAG_SITES } from "./cache-tags";

/**
 * Sitio que se está viendo.
 *
 * Hay DOS caminos, a propósito:
 *
 *  1. `getCurrentSite()` — panel de administración. Lee el dominio y la cookie del sitio que estás
 *     editando. Es dinámico (cada visita se renderiza de nuevo), y está bien: lo usa una sola persona.
 *
 *  2. `siteFromSlug()` — sitio público. El sitio llega como PARÁMETRO de la ruta (`/h/<sitio>/...`,
 *     una dirección interna que arma `src/proxy.ts`). Al no leer cookies ni cabeceras, las páginas
 *     públicas pueden guardarse en caché y no gastar CPU en cada visita.
 */

/** Cookie con el sitio que el administrador está editando desde el dominio principal. */
export const SITE_COOKIE = "jomer_sitio";

/** Sitio principal: se representa con "_" en la dirección interna. */
export const MAIN_SLUG = "_";

export type SiteContext = {
  /** "" = sitio principal; si no, el subdominio (ej: "juegos") */
  slug: string;
  isMain: boolean;
  /** host: elegido por el dominio · preview: el administrador lo eligió en el panel · main: sitio principal */
  via: "host" | "preview" | "main";
  /** Dominio con el que se abrió la página (puede incluir el puerto) */
  host: string;
};

/** Dominio de la visita (solo lo usa el panel). */
export async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
}

/** Subdominios creados (sin contar el sitio principal). */
async function loadSiteSlugs(): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureSeeded();
    const rows = await db.select({ slug: sites.slug }).from(sites).orderBy(asc(sites.createdAt));
    return rows.map((r) => r.slug);
  } catch (err) {
    console.error("[sites]", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Lista de subdominios, sin caché (panel: siempre al día). */
export const getSiteSlugs = cache(loadSiteSlugs);

/** Lista de subdominios cacheada (sitio público): se refresca al crear o borrar un sitio. */
export const cachedSiteSlugs = unstable_cache(loadSiteSlugs, ["lista-de-sitios"], {
  revalidate: 3600,
  tags: [TAG_SITES, TAG_CONTENT],
});

/** Convierte el dominio de una visita en su sitio. */
export function siteFromHost(host: string, slugs: string[]): SiteContext {
  const sub = subdomainCandidate(host);
  if (sub && slugs.includes(sub)) return { slug: sub, isMain: false, via: "host", host };
  return { slug: "", isMain: true, via: "main", host };
}

/**
 * Sitio público a partir del segmento de la ruta (`_` = principal).
 * Si el subdominio no existe (o la base no responde), se muestra el sitio principal, igual que antes.
 */
export async function siteFromSlug(segment: string): Promise<SiteContext> {
  const slugs = await cachedSiteSlugs();
  const slug = segment === MAIN_SLUG ? "" : segment;
  if (slug && slugs.includes(slug)) return { slug, isMain: false, via: "host", host: "" };
  return { slug: "", isMain: true, via: "main", host: "" };
}

/** Sitio que se está editando en el panel (dominio + cookie). Siempre dinámico. */
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
