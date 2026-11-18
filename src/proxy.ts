import { NextResponse, type NextRequest } from "next/server";
import { subdomainCandidate } from "@/lib/hosts";

/**
 * Proxy (el antiguo “middleware”) de Next.js.
 *
 * Hace dos cosas:
 *
 *  1. En el panel (`/admin`) pide a los buscadores que no lo indexen.
 *  2. En el sitio público traduce la dirección que ve el visitante a una dirección INTERNA que
 *     incluye el sitio:  jomerarte.com/Servicios  →  /h/_/Servicios
 *                        juegos.jomerarte.com/     →  /h/juegos
 *
 *     Así cada subdominio es su propia página a ojos de la caché (la caché guarda por dirección),
 *     y las páginas públicas ya no necesitan leer cookies ni cabeceras para saber qué sitio son.
 *     El visitante nunca ve la dirección interna: la reescritura es transparente.
 *
 * La parte de IndexNow (`/jomer-<clave>.txt`) se deja pasar tal cual, porque la maneja
 * el `rewrites()` de next.config.ts.
 */

/** Archivos estáticos servidos por la carpeta `public/` (no pasan por la reescritura). */
const STATIC_FILE = /^\/(images\/|icon\.svg$|favicon\.ico$|BingSiteAuth\.xml$)/;
/** Archivo de verificación de IndexNow (rewrite de next.config.ts). */
const INDEXNOW_FILE = /^\/jomer-[a-f0-9]{32}\.txt$/;

/**
 * Escaneos automáticos. Miles de robots piden a diario direcciones que no existen en este sitio
 * (paneles de WordPress, archivos de configuración, respaldos…). Cada una de esas visitas hacía que
 * Next renderizara una página entera y consultara la base: eso fue lo que infló el consumo de CPU.
 * Se cortan acá, antes de tocar la base, con un 404 liviano.
 */
const SCANNER =
  /^(\/wp-|\/wordpress|\/xmlrpc\.php|\/phpmyadmin|\/pma(\/|$)|\/cgi-bin\/|\/vendor\/|\/\.(env|git|aws|ssh|htaccess|ds_store|vscode|idea)|\/administrator|\/admin\.php|\/actuator|\/hnap1|\/owa\/|\/ecp\/|\/boaform|\/manager\/html|\/server-status|\/config\.|\/docker-compose|\/backup|\/dump|\/db\.|\/\.well-known\/(?!acme-challenge))/i;
/** Archivos que el sitio sí sirve desde la raíz. */
const KNOWN_FILE =
  /^\/(robots\.txt|sitemap\.xml|llms\.txt|llms-full\.txt|manifest\.webmanifest|icon\.svg|favicon\.ico|BingSiteAuth\.xml|jomer-[a-f0-9]{32}\.txt)$/i;
const HAS_EXTENSION = /\.[a-z0-9]{1,6}$/i;

/** ¿Es una dirección de escaneo que no existe en el sitio? (cualquier archivo raro, menos los nuestros) */
function isJunkPath(pathname: string): boolean {
  if (SCANNER.test(pathname)) return true;
  return HAS_EXTENSION.test(pathname) && !KNOWN_FILE.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  // Las direcciones internas (/h/...) no se muestran ni se indexan: solo existen por reescritura.
  if (pathname === "/h" || pathname.startsWith("/h/")) {
    return new NextResponse("No encontrado", { status: 404, headers: { "x-robots-tag": "noindex, nofollow" } });
  }

  if (pathname.startsWith("/api") || STATIC_FILE.test(pathname) || INDEXNOW_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // Certificados y verificaciones de dominio (Let's Encrypt y similares): siempre pasan
  if (pathname.startsWith("/.well-known/acme-challenge/")) return NextResponse.next();

  // Corta los escaneos sin llegar a renderizar ni consultar la base de datos
  if (isJunkPath(pathname)) {
    return new NextResponse("No encontrado", { status: 404, headers: { "x-robots-tag": "noindex, nofollow" } });
  }

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  const slug = subdomainCandidate(host) ?? "_";

  const url = request.nextUrl.clone();
  url.pathname = `/h/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
