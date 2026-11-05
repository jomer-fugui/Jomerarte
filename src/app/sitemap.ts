import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/sitemap-entries";

export const dynamic = "force-dynamic";

/** sitemap.xml propio de cada sitio (el principal y cada subdominio), con fechas e imágenes. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries();
}
