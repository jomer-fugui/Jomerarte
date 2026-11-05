import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/zen-dots";
import "./globals.css";
import { getSettings } from "@/lib/data";
import { countryInfo, geoOf, twitterHandle, verificationCode } from "@/lib/seo";
import { getDefaultSeo } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

/** Metadatos de todo el sitio (cada página agrega su título, descripción, imagen y dirección canónica). */
export async function generateMetadata(): Promise<Metadata> {
  const d = await getDefaultSeo();
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
    robots:
      d.site.via === "preview"
        ? { index: false, follow: false }
        : {
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  const accent = /^#[0-9a-f]{3,8}$/i.test(s.accentColor) ? s.accentColor : "#b3121f";
  return (
    <html lang={countryInfo(s.country).lang} style={{ "--accent": accent } as CSSProperties}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
