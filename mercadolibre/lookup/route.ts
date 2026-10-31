import { isAdmin } from "@/lib/auth";
import { lookupMl } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

/** Botón “Detectar y traer precio” del panel: busca el código del producto y su precio actual. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ ok: false, message: "No autorizado. Vuelve a iniciar sesión." }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const result = await lookupMl((params.get("ref") ?? "").slice(0, 500), (params.get("link") ?? "").slice(0, 2000));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
