import { siteFromSlug } from "@/lib/site";
import { sitemapEntries } from "@/lib/sitemap-entries";
import { sitemapToXml } from "@/lib/sitemap-xml";

export const dynamic = "force-static";
export const revalidate = 3600;

/** sitemap.xml propio de cada sitio (el principal y cada subdominio), con fechas e imágenes. */
export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const site = await siteFromSlug((await ctx.params).site);
  try {
    const xml = sitemapToXml(await sitemapEntries(site));
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": `public, s-maxage=3600, stale-while-revalidate=86400`,
      },
    });
  } catch (err) {
    console.error("[sitemap]", err instanceof Error ? err.message : err);
    return new Response("No se pudo generar el mapa del sitio.", {
      status: 500,
      headers: { "cache-control": "no-store" },
    });
  }
}
