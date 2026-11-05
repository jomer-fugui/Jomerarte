import { cachedSettings } from "@/lib/data";
import { excerpt } from "@/lib/format";
import { countryInfo } from "@/lib/seo";
import { siteFromSlug } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 3600;

/** Manifiesto de la web (nombre, colores e ícono) de cada sitio. */
export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const site = await siteFromSlug((await ctx.params).site);
  const s = await cachedSettings(site.slug);
  const manifest = {
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
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": `public, s-maxage=3600, stale-while-revalidate=86400`,
    },
  });
}
