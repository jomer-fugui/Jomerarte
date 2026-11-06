import { cachedSettings } from "@/lib/data";
import { aiPolicyOf } from "@/lib/seo";
import { baseUrlFor } from "@/lib/seo-server";
import { siteFromSlug } from "@/lib/site";

// OJO: acá NO va `export const dynamic = "force-static"`.
// El build de Vercel (su adaptador) se cae con
//   "Invariant: failed to find source route /h/[site]/sitemap.xml for prerender /h/[site]/sitemap.xml"
// cuando una ruta que se llama como un archivo de metadatos (sitemap.xml, robots.txt,
// manifest.webmanifest) es estática dentro de una carpeta con parámetro ([site]).
// Se genera al vuelo y igual queda cacheada una hora en el CDN: mirá la cabecera Cache-Control.
export const revalidate = 3600;

const PUBLIC = ["/", "/api/media/"];
const PRIVATE = [
  "/admin",
  "/api/upload",
  "/api/og",
  "/api/blob",
  "/api/mercadolibre",
  "/api/cron",
  "/api/indexnow",
  "/api/whoami",
  "/buscar",
];

/** Asistentes que buscan y recomiendan páginas en tiempo real (ChatGPT, Perplexity, Claude, Gemini…). */
const AI_ASSISTANTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "DuckAssistBot",
  "MistralAI-User",
];
/** Robots que solo recopilan contenido para entrenar modelos de IA. */
const AI_TRAINING = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "Meta-ExternalAgent",
  "cohere-ai",
  "cohere-training-data-crawler",
];

type Rule = { userAgent: string | string[]; allow?: string | string[]; disallow?: string | string[] };

function block(rule: Rule): string {
  const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
  const lines = agents.map((a) => `User-agent: ${a}`);
  for (const p of rule.allow ? (Array.isArray(rule.allow) ? rule.allow : [rule.allow]) : []) lines.push(`Allow: ${p}`);
  for (const p of rule.disallow ? (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]) : []) {
    lines.push(`Disallow: ${p}`);
  }
  return lines.join("\n");
}

/** robots.txt de cada sitio: buscadores siempre permitidos; asistentes con IA según los ajustes. */
export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const site = await siteFromSlug((await ctx.params).site);
  const s = await cachedSettings(site.slug);
  const policy = aiPolicyOf(s.aiPolicy);

  const rules: Rule[] = [{ userAgent: "*", allow: PUBLIC, disallow: PRIVATE }];
  if (policy === "all") {
    rules.push({ userAgent: [...AI_ASSISTANTS, ...AI_TRAINING], allow: PUBLIC, disallow: PRIVATE });
  } else if (policy === "no-training") {
    rules.push({ userAgent: AI_ASSISTANTS, allow: PUBLIC, disallow: PRIVATE });
    rules.push({ userAgent: AI_TRAINING, disallow: "/" });
  } else {
    rules.push({ userAgent: [...AI_ASSISTANTS, ...AI_TRAINING], disallow: "/" });
  }

  const body = `${rules.map(block).join("\n\n")}\n\nSitemap: ${baseUrlFor(site)}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `public, s-maxage=3600, stale-while-revalidate=86400`,
    },
  });
}
