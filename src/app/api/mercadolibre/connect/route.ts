import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { mlAuthorizationUrl, mlRedirectUri, pkcePair, requestOrigin } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";

function goTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

/** Paso 1 de la conexión: lleva al administrador a Mercado Libre para autorizar la aplicación. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return goTo("/admin/login");
  const origin = requestOrigin(req.headers);
  const redirectUri = mlRedirectUri(origin);
  const target = new URL(redirectUri);
  // Mercado Libre vuelve al dominio registrado: la conexión tiene que empezar en ese mismo dominio
  if (target.host !== new URL(origin).host) {
    return NextResponse.redirect(new URL("/api/mercadolibre/connect", target.origin));
  }
  const state = crypto.randomBytes(16).toString("hex");
  const { verifier, challenge } = pkcePair();
  const url = await mlAuthorizationUrl(redirectUri, state, challenge);
  if (!url) return goTo("/admin/mercadolibre?error=credenciales");
  const res = NextResponse.redirect(url);
  res.cookies.set("ml_oauth", `${state}.${verifier}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/mercadolibre",
    maxAge: 600,
  });
  return res;
}
