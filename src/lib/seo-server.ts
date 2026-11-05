import { cache } from "react";
import { headers } from "next/headers";
import { isDatabaseConfigured } from "@/db";
import { getItems, getSettings } from "./data";
import { excerpt } from "./format";
import { rootDomain, siteBaseUrl } from "./hosts";
import { absUrl, countryInfo, makeSeoContext, type SeoContext } from "./seo";
import { getCurrentSite } from "./site";

/**
 * Dirección pública del sitio que se está viendo:
 *  - Sitio principal: NEXT_PUBLIC_SITE_URL (ej: https://jomerarte.com) o el dominio de la visita.
 *  - Subdominio: https://juegos.jomerarte.com
 */
export const getBaseUrl = cache(async (): Promise<string> => {
  const [site, h] = await Promise.all([getCurrentSite(), headers()]);
  const host = site.host || h.get("host") || "localhost";
  const local = /^(localhost|127\.|\[::1\])/.test(host) || /\.localhost(:\d+)?$/.test(host);
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() || (local ? "http" : "https");
  if (site.isMain) return siteBaseUrl() ?? `${proto}://${host}`;
  const root = rootDomain();
  if (root && !local) return `https://${site.slug}.${root}`;
  return `${proto}://${host}`;
});

/** Todo lo necesario para armar los datos estructurados del sitio actual. */
export const getSeoContext = cache(async (): Promise<SeoContext> => {
  const [site, settings, base] = await Promise.all([getCurrentSite(), getSettings(), getBaseUrl()]);
  // Tus otras páginas (“Mis páginas”) también te identifican ante Google y las IA
  let extra: string[] = [];
  if (site.isMain && isDatabaseConfigured()) {
    try {
      extra = (await getItems("mis-paginas")).map((l) => l.linkUrl).filter((u) => /^https?:\/\//i.test(u));
    } catch {
      extra = [];
    }
  }
  return makeSeoContext(base, settings, site.isMain, extra);
});

/** Título, descripción e imagen por defecto del sitio (para Google y al compartir). */
export const getDefaultSeo = cache(async () => {
  const [settings, base, site] = await Promise.all([getSettings(), getBaseUrl(), getCurrentSite()]);
  const title = settings.seoTitle.trim() || (settings.tagline ? `${settings.siteName} · ${settings.tagline}` : settings.siteName);
  const description =
    excerpt(settings.seoDescription || settings.heroText || settings.tagline || settings.siteName, 160) || settings.siteName;
  const image =
    absUrl(base, settings.heroImage) ?? absUrl(base, settings.logoUrl) ?? absUrl(base, settings.logoLightUrl) ?? undefined;
  return { settings, base, site, title, description, image, locale: countryInfo(settings.country).ogLocale };
});
