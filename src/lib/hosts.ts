/**
 * Dominios y subdominios (sin dependencias del servidor: también se usa en el navegador).
 * El dominio principal sale de NEXT_PUBLIC_SITE_URL (ej: https://jomerarte.com).
 */

/** Nombres que no se pueden usar como subdominio. */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "app",
  "mail",
  "correo",
  "email",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "cdn",
  "static",
  "assets",
  "img",
  "images",
  "media",
  "blob",
  "files",
  "vercel",
  "localhost",
  "jomerarte",
  "ns1",
  "ns2",
  "dns",
  "status",
]);

/**
 * Dirección pública del sitio principal según NEXT_PUBLIC_SITE_URL (ej: "https://jomerarte.com").
 * Acepta "jomerarte.com" sin https://. Devuelve null si no hay un dominio válido configurado.
 */
export function siteBaseUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!/^https?:$/.test(url.protocol) || !host.includes(".") || /^[\d.]+$/.test(host)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Dominio principal configurado (ej: "jomerarte.com"), o null si no se configuró uno válido. */
export function rootDomain(): string | null {
  const base = siteBaseUrl();
  if (!base) return null;
  return new URL(base).hostname.toLowerCase().replace(/^www\./, "");
}

/** "Juegos.Jomerarte.com:443" → "juegos.jomerarte.com" */
export function cleanHost(host: string): string {
  return (host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Posible subdominio de un dominio: "juegos.jomerarte.com" → "juegos". */
export function subdomainCandidate(rawHost: string): string | null {
  const host = cleanHost(rawHost);
  if (!host || host === "localhost" || host.startsWith("[") || /^[\d.]+$/.test(host)) return null;
  // Pruebas en la computadora: juegos.localhost:3000
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    return sub && !sub.includes(".") ? sub : null;
  }
  const root = rootDomain();
  if (root) {
    if (host === root || host === `www.${root}`) return null;
    if (host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -(root.length + 1));
      return sub.includes(".") ? null : sub;
    }
  }
  const labels = host.split(".");
  return labels.length >= 3 ? labels[0] : null;
}

/** Deja un nombre de subdominio válido: letras minúsculas, números y guiones. */
export function normalizeSubdomain(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Dirección para mostrar: "" → "jomerarte.com", "juegos" → "juegos.jomerarte.com" */
export function siteLabel(slug: string): string {
  const root = rootDomain() ?? "jomerarte.com";
  return slug ? `${slug}.${root}` : root;
}

/** Enlace real a un sitio, o null si todavía no se conoce el dominio. */
export function siteUrl(slug: string, rawHost: string): string | null {
  const first = (rawHost || "").split(",")[0].trim().toLowerCase();
  const host = cleanHost(first);
  const port = first.match(/:(\d+)$/)?.[1];
  if (host === "localhost" || host.endsWith(".localhost")) {
    return `http://${slug ? `${slug}.` : ""}localhost${port ? `:${port}` : ""}`;
  }
  const root = rootDomain();
  if (!root) return null;
  return `https://${slug ? `${slug}.` : ""}${root}`;
}

/** Dominio para compartir la sesión del panel entre jomerarte.com y todos sus subdominios. */
export function sharedCookieDomain(rawHost: string): string | undefined {
  const root = rootDomain();
  const host = cleanHost(rawHost);
  if (!root || !host) return undefined;
  return host === root || host.endsWith(`.${root}`) ? root : undefined;
}
