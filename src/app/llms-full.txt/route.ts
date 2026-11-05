import { buildLlmsTxt } from "@/lib/llms";

export const dynamic = "force-dynamic";

/** /llms-full.txt: resumen del sitio en texto para los asistentes con IA (ver src/lib/llms.ts). */
export async function GET() {
  const text = await buildLlmsTxt(true);
  if (text === null) return new Response("Not found", { status: 404 });
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
      "x-robots-tag": "noindex",
    },
  });
}
