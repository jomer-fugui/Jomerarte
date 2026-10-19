import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/hosts";
import { getCurrentSite } from "@/lib/site";

export const dynamic = "force-dynamic";

/** robots.txt propio de cada sitio (el principal y cada subdominio apuntan a su propio sitemap). */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getCurrentSite();
  const base = site.isMain
    ? (siteBaseUrl() ?? (site.host ? `https://${site.host}` : "https://jomerarte.com"))
    : `https://${site.host}`;
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: ["/admin", "/api/upload", "/api/og", "/api/blob"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
