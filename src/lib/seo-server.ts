import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isDatabaseConfigured } from "@/db";
import { cachedItems, cachedSettings, freshSettings, getItems, type Item } from "./data";
import type { Settings } from "./defaults";
import { excerpt } from "./format";
import { rootDomain, siteBaseUrl, siteLabel } from "./hosts";
import { absUrl, countryInfo, makeSeoContext, type SeoContext } from "./seo";
import { getCurrentSite, type SiteContext } from "./site";
import { PAGE_REVALIDATE, TAG_CONTENT } from "./cache-tags";

/**
 * Dirección pública de un sitio:
 *  - Sitio principal: NEXT_PUBLIC_SITE_URL (ej: https://jomerarte.com).
 *  - Subdominio: https://juegos.jomerarte.com
 * Si el dominio no está configurado se usa el nombre del sitio, para que los enlaces canónicos
 * nunca queden vacíos (Google necesita una dirección absoluta).
 */
export function baseUrlFor(site: SiteContext): string {
  const host = site.host;
  const local = !host || /^(localhost|127\.|\[::1\])/.test(host) || /\.localhost(:\d+)?$/.test(host);
  if (site.isMain) {
    const configured = siteBaseUrl();
    if (configured) return configured;
    return `https://${siteLabel("")}`;
  }
  const root = rootDomain();
  if (root) return `https://${site.slug}.${root}`;
  if (!local) return `https://${host}`;
  return `https://${siteLabel(site.slug)}`;
}

/** Dirección pública del sitio que se está viendo en el panel. */
export const getBaseUrl = cache(async (): Promise<string> => baseUrlFor(await getCurrentSite()));

function seoFrom(base: string, settings: Settings, isMain: boolean, extra: string[]): SeoContext {
  return makeSeoContext(base, settings, isMain, extra);
}

/** Tus otras páginas (“Mis páginas”) también te identifican ante Google y las IA. */
async function extraLinks(slug: string, loader: (s: string) => Promise<Item[]>): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return (await loader(slug)).map((l) => l.linkUrl).filter((u) => /^https?:\/\//i.test(u));
  } catch {
    return [];
  }
}

/* ── Sitio público (cacheado) ─────────────────────────────────────────────── */

const loadPublicSeo = async (slug: string): Promise<SeoContext> => {
  const [settings, extra] = await Promise.all([
    cachedSettings(slug),
    slug === "" ? extraLinks(slug, (s) => cachedItems(s, "mis-paginas", {})) : Promise.resolve<string[]>([]),
  ]);
  return seoFrom(baseUrlFor({ slug, isMain: slug === "", via: "host", host: "" }), settings, slug === "", extra);
};

export const cachedSeoContext = unstable_cache(loadPublicSeo, ["seo"], {
  revalidate: PAGE_REVALIDATE,
  tags: [TAG_CONTENT],
});

export type DefaultSeo = {
  settings: Settings;
  base: string;
  title: string;
  description: string;
  image?: string;
  locale: string;
};

const loadDefaultSeo = async (slug: string): Promise<DefaultSeo> => {
  const [settings, seo] = await Promise.all([cachedSettings(slug), cachedSeoContext(slug)]);
  return defaultSeoFrom(settings, seo.base);
};

export const cachedDefaultSeo = unstable_cache(loadDefaultSeo, ["seo-por-defecto"], {
  revalidate: PAGE_REVALIDATE,
  tags: [TAG_CONTENT],
});

/* ── Panel (sin caché, siempre al día) ────────────────────────────────────── */

/** Todo lo necesario para armar los datos estructurados del sitio que se está editando. */
export const getSeoContext = cache(async (): Promise<SeoContext> => {
  const site = await getCurrentSite();
  const [settings, extra] = await Promise.all([
    freshSettings(site.slug),
    site.isMain ? extraLinks("", (s) => getItems("mis-paginas", { site: s })) : Promise.resolve<string[]>([]),
  ]);
  return seoFrom(baseUrlFor(site), settings, site.isMain, extra);
});

/** Título, descripción e imagen por defecto del sitio que se está editando. */
export const getDefaultSeo = cache(async (): Promise<DefaultSeo> => {
  const [settings, seo] = await Promise.all([freshSettings((await getCurrentSite()).slug), getSeoContext()]);
  return defaultSeoFrom(settings, seo.base);
});

function defaultSeoFrom(settings: Settings, base: string): DefaultSeo {
  const title =
    settings.seoTitle.trim() || (settings.tagline ? `${settings.siteName} · ${settings.tagline}` : settings.siteName);
  const description =
    excerpt(settings.seoDescription || settings.heroText || settings.tagline || settings.siteName, 160) ||
    settings.siteName;
  const image =
    absUrl(base, settings.heroImage) ?? absUrl(base, settings.logoUrl) ?? absUrl(base, settings.logoLightUrl) ?? undefined;
  return { settings, base, title, description, image, locale: countryInfo(settings.country).ogLocale };
}
