import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { excerpt } from "@/lib/format";
import { countryInfo } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Manifiesto de la web (nombre, colores e ícono) de cada sitio. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.siteName,
    short_name: s.siteName.length > 12 ? s.siteName.slice(0, 12) : s.siteName,
    description: excerpt(s.seoDescription || s.heroText || s.tagline || s.siteName, 160),
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: /^#[0-9a-f]{6}$/i.test(s.accentColor) ? s.accentColor : "#b3121f",
    lang: countryInfo(s.country).lang,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
