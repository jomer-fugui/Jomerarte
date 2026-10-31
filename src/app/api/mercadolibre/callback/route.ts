import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { connectWithCode, mlRedirectUri, requestOrigin } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

/** Paso 2 de la conexión: Mercado Libre vuelve aquí con un código que se cambia por los tokens. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const back = (query: string) => {
    const res = new NextResponse(null, { status: 303, headers: { Location: `/admin/mercadolibre?${query}` } });
    res.cookies.set("ml_oauth", "", { path: "/api/mercadolibre", maxAge: 0 });
    return res;
  };
  if (!(await isAdmin())) return new NextResponse(null, { status: 303, headers: { Location: "/admin/login" } });

  const denied = params.get("error");
  if (denied) return back(`error=${encodeURIComponent(params.get("error_description") || denied)}`);

  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";
  const [savedState, verifier] = ((await cookies()).get("ml_oauth")?.value ?? "").split(".");
  if (!code || !state || !savedState || state !== savedState) return back("error=estado");

  const result = await connectWithCode(code, verifier ?? "", mlRedirectUri(requestOrigin(req.headers)));
  if (!result.ok) return back(`error=${encodeURIComponent(result.error)}`);
  return back("ok=conectado");
}
