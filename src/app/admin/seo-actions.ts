"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { submitToIndexNow } from "@/lib/indexnow";
import { sitemapEntries } from "@/lib/sitemap-entries";
import { getCurrentSite } from "@/lib/site";

/** Avisa ahora a Bing y a los buscadores de IndexNow de todas las páginas del sitio actual. */
export async function pingAllAction() {
  await requireAdmin();
  const site = await getCurrentSite();
  const entries = await sitemapEntries(site);
  const r = await submitToIndexNow(site.slug, entries.map((e) => e.url));
  redirect(`/admin/seo?ping=${r.ok ? "ok" : "error"}&msg=${encodeURIComponent(r.message)}`);
}
