import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { isDatabaseConfigured } from "@/db";
import { DbMissing } from "@/components/DbMissing";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { cachedCustomSections, cachedMenuModel, cachedPageTexts, cachedSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { buildNav, buildSubsiteNav } from "@/lib/nav";
import { countryInfo, geoOf, jsonLdGraph, siteGraph, twitterHandle, verificationCode } from "@/lib/seo";
import { cachedDefaultSeo, cachedSeoContext } from "@/lib/seo-server";
import { siteFromSlug } from "@/lib/site";

type Props = { children: ReactNode; params: Promise<{ site: string }> };

/**
 * El sitio público se genera UNA vez y se sirve desde la caché; se vuelve a generar como mucho cada
 * 5 minutos, o al instante cuando guardas en el panel (ver src/lib/revalidate.ts).
 * `force-static` es lo que le dice a Next que esta página NO use cookies ni cabeceras.
 */
export const dynamic = "force-static";
export const revalidate = 300;

/**
 * Marco del sitio público: cabecera, pie, menú, datos estructurados y el color de cada sitio.
 *
 * El sitio llega como parámetro de la ruta (`/h/<sitio>/…`, ver src/proxy.ts), NO por cookies ni
 * cabeceras: por eso esta página puede guardarse en caché y repetirse sin gastar CPU.
 */

/** Metadatos de todo el sitio (cada página agrega su título, descripción, imagen y dirección canónica). */
export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = await siteFromSlug((await params).site);
  const d = await cachedDefaultSeo(site.slug);
  const s = d.settings;
  const country = countryInfo(s.country);
  const coords = geoOf(s);
  const place = [s.city, s.region].filter(Boolean).join(", ");
  const geo: Record<string, string> = { "geo.region": country.code };
  if (place) geo["geo.placename"] = place;
  if (coords) {
    geo["geo.position"] = `${coords.lat};${coords.lng}`;
    geo.ICBM = `${coords.lat}, ${coords.lng}`;
  }
  const google = verificationCode(s.googleVerification);
  const bing = verificationCode(s.bingVerification);
  const handle = twitterHandle(s.twitter);
  return {
    metadataBase: new URL(d.base),
    title: { default: d.title, template: `%s | ${s.siteName}` },
    description: d.description,
    applicationName: s.siteName,
    authors: s.ownerName ? [{ name: s.ownerName }] : undefined,
    creator: s.ownerName || undefined,
    publisher: s.siteName,
    openGraph: {
      type: "website",
      siteName: s.siteName,
      locale: d.locale,
      title: d.title,
      description: d.description,
      images: d.image ? [{ url: d.image }] : undefined,
    },
    twitter: {
      card: d.image ? "summary_large_image" : "summary",
      title: d.title,
      description: d.description,
      images: d.image ? [d.image] : undefined,
      site: handle,
      creator: handle,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    verification: {
      google: google || undefined,
      other: bing ? { "msvalidate.01": bing } : undefined,
    },
    other: geo,
  };
}

export default async function SiteLayout({ children, params }: Props) {
  if (!isDatabaseConfigured()) return <DbMissing />;

  const slug = (await params).site;
  const site = await siteFromSlug(slug);
  const [settings, pages, customs, menu, seo] = await Promise.all([
    cachedSettings(site.slug),
    cachedPageTexts(site.slug),
    cachedCustomSections(site.slug),
    cachedMenuModel(site.slug),
    cachedSeoContext(site.slug),
  ]);
  const visible = customs.filter((c) => c.visible);
  // Cada sitio tiene su propio menú: el principal con sus secciones fijas, los subdominios con sus páginas
  const nav = site.isMain ? buildNav(menu, pages) : buildSubsiteNav(visible, pages);
  const donateHref = site.isMain
    ? pages.donacion?.visible !== false
      ? "/Donacion"
      : null
    : (visible.find((c) => c.type.key === "donations")?.path ?? null);
  const wa = waLink(settings.whatsapp, settings.whatsappMessage);
  const accent = /^#[0-9a-f]{3,8}$/i.test(settings.accentColor) ? settings.accentColor : "#b3121f";

  return (
    <>
      <style>{`:root{--accent:${accent}}`}</style>
      <JsonLd data={jsonLdGraph(siteGraph(seo))} />
      <Header settings={settings} nav={nav} donateHref={donateHref} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer settings={settings} nav={nav} />
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribir por WhatsApp"
          className="no-print fixed right-5 bottom-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-zinc-950 shadow-xl shadow-black/50 transition hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </>
  );
}
