import { isDatabaseConfigured } from "@/db";
import { getIndexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/** Archivo de verificación de IndexNow: /{clave}.txt (ver next.config.ts) devuelve la clave. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Con la reescritura de next.config.ts la clave llega como ?file=…; por las dudas también se lee de la dirección
  const file = url.searchParams.get("file") || url.pathname.match(/(jomer-[a-f0-9]{32})\.txt$/)?.[1] || "";
  if (!isDatabaseConfigured() || !/^jomer-[a-f0-9]{32}$/.test(file)) return new Response("Not found", { status: 404 });
  const key = await getIndexNowKey();
  if (file !== key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}
