import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { aiPolicyOf } from "@/lib/seo";
import { getBaseUrl } from "@/lib/seo-server";

export const dynamic = "force-dynamic";

const PUBLIC = ["/", "/api/media/"];
const PRIVATE = ["/admin", "/api/upload", "/api/og", "/api/blob", "/api/mercadolibre", "/api/cron", "/api/indexnow"];

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

/** robots.txt de cada sitio: buscadores siempre permitidos; asistentes con IA según los ajustes. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [base, s] = await Promise.all([getBaseUrl(), getSettings()]);
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
  return { rules, sitemap: `${base}/sitemap.xml` };
}
