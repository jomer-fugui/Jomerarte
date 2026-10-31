import { NextResponse } from "next/server";

/**
 * Proxy de Next.js.
 *
 * IMPORTANTE: este archivo REEMPLAZA a la versión antigua que redirigía frases.jomerarte.com y
 * cielinfier.jomerarte.com a secciones del sitio principal (/Frases, /Cielinfier). Esa versión
 * provocaba errores 404 en esos subdominios. Ahora cada subdominio es un sitio independiente y
 * se resuelve dentro de la aplicación, así que aquí ya NO se reescribe ninguna dirección.
 *
 * Lo único que hace es pedir a los buscadores que no indexen el panel de administración.
 */
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
