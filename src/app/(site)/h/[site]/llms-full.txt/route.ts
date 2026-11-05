import { buildLlmsTxt } from "@/lib/llms";
import { siteFromSlug } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 3600;

/** /llms-full.txt: todo el contenido del sitio en texto, para los asistentes con IA. */
export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const site = await siteFromSlug((await ctx.params).site);
  const text = await buildLlmsTxt(site, true);
  if (text === null) return new Response("Not found", { status: 404, headers: { "cache-control": "public, s-maxage=600" } });
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `public, s-maxage=3600, stale-while-revalidate=86400`,
    },
  });
}
