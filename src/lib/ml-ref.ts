/**
 * Utilidades de Mercado Libre que también se usan en el navegador (sin acceso al servidor):
 * reconocer enlaces y códigos de productos, formatear precios y describir el estado.
 */

export type MlKind = "item" | "product";
/** item = publicación (MLA-1234567890) · product = página de producto de catálogo (/p/MLA12345678) */
export type MlRef = { id: string; type: MlKind };

/** Último resultado consultado en Mercado Libre (se guarda en cada producto). */
export type MlInfo = {
  amount?: number | null;
  /** Precio anterior a la promoción (para mostrarlo tachado) */
  original?: number | null;
  currency?: string;
  /** active · paused · closed · inactive · no_stock */
  status?: string;
  available?: number | null;
  title?: string;
  checkedAt?: string;
  changedAt?: string;
  previous?: number | null;
  error?: string;
};

export const ML_COUNTRIES = [
  { site: "MLA", name: "Argentina", domain: "mercadolibre.com.ar", tz: "America/Argentina/Buenos_Aires" },
  { site: "MLB", name: "Brasil", domain: "mercadolivre.com.br", tz: "America/Sao_Paulo" },
  { site: "MLM", name: "México", domain: "mercadolibre.com.mx", tz: "America/Mexico_City" },
  { site: "MLC", name: "Chile", domain: "mercadolibre.cl", tz: "America/Santiago" },
  { site: "MCO", name: "Colombia", domain: "mercadolibre.com.co", tz: "America/Bogota" },
  { site: "MLU", name: "Uruguay", domain: "mercadolibre.com.uy", tz: "America/Montevideo" },
  { site: "MPE", name: "Perú", domain: "mercadolibre.com.pe", tz: "America/Lima" },
  { site: "MLV", name: "Venezuela", domain: "mercadolibre.com.ve", tz: "America/Caracas" },
  { site: "MEC", name: "Ecuador", domain: "mercadolibre.com.ec", tz: "America/Guayaquil" },
] as const;

export type MlCountry = (typeof ML_COUNTRIES)[number];

export function mlCountry(site?: string | null): MlCountry {
  return ML_COUNTRIES.find((c) => c.site === site) ?? ML_COUNTRIES[0];
}

const ML_HOST = /(^|\.)(mercadolibre|mercadolivre)\.(com|com\.[a-z]{2}|[a-z]{2})$/;

function toUrl(raw: string): URL | null {
  const s = (raw || "").trim();
  if (!s) return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

/** ¿Es un enlace de Mercado Libre (incluye links de afiliado)? */
export function isMlUrl(raw: string): boolean {
  const host = toUrl(raw)?.hostname.toLowerCase() ?? "";
  return Boolean(host && (ML_HOST.test(host) || host === "meli.la" || host.endsWith(".meli.la")));
}

/** Link corto de afiliado (meli.la/… o mercadolibre.com/sec/…): no muestra el código del producto. */
export function isMlShortLink(raw: string): boolean {
  const url = toUrl(raw);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  if (host === "meli.la" || host.endsWith(".meli.la")) return true;
  return ML_HOST.test(host) && /^\/sec\//i.test(url.pathname);
}

/**
 * Saca el código del producto de un enlace o de un código escrito a mano.
 *  - …/p/MLA12345678                  → página de producto (la opción más confiable)
 *  - …?item_id=MLA123… · #wid=MLA123… → publicación
 *  - articulo…/MLA-1234567890-titulo  → publicación
 *  - MLA12345678 (escrito a mano)     → hasta 8 dígitos: página de producto · 9 o más: publicación
 */
export function parseMlRef(input: string): MlRef | null {
  const s = (input || "").trim();
  if (!s) return null;
  const code = s.toUpperCase().replace(/\s+/g, "").match(/^(M[A-Z]{2})-?(\d{5,13})$/);
  if (code) return { id: code[1] + code[2], type: code[2].length >= 9 ? "item" : "product" };
  if (!isMlUrl(s)) return null;
  const url = toUrl(s);
  if (!url) return null;
  let all = `${url.pathname}?${url.search}#${url.hash}`;
  try {
    all = decodeURIComponent(all);
  } catch {
    // dirección con caracteres raros: se usa tal cual
  }
  let m = all.match(/\/p\/(M[A-Z]{2})(\d{5,13})/i);
  if (m) return { id: (m[1] + m[2]).toUpperCase(), type: "product" };
  m = all.match(/(?:item_id[:=]|wid=)(M[A-Z]{2})-?(\d{6,13})/i);
  if (m) return { id: (m[1] + m[2]).toUpperCase(), type: "item" };
  m = url.pathname.match(/\/(M[A-Z]{2})-?(\d{6,13})(?=[-_/]|$)/i);
  if (m) return { id: (m[1] + m[2]).toUpperCase(), type: "item" };
  return null;
}

export function mlRefLabel(ref: MlRef): string {
  return ref.type === "product" ? `${ref.id} · página de producto` : `${ref.id} · publicación`;
}

/** Enlace público para revisar el producto en Mercado Libre (solo para el panel). */
export function mlPublicUrl(ref: MlRef): string {
  const c = mlCountry(ref.id.slice(0, 3));
  return ref.type === "product"
    ? `https://www.${c.domain}/p/${ref.id}`
    : `https://articulo.${c.domain}/${ref.id.slice(0, 3)}-${ref.id.slice(3)}`;
}

const SYMBOL: Record<string, string> = {
  ARS: "$",
  USD: "US$",
  BRL: "R$",
  MXN: "$",
  CLP: "$",
  COP: "$",
  UYU: "$",
  PEN: "S/",
  VES: "Bs.",
  BOB: "Bs",
  PYG: "₲",
  CRC: "₡",
  GTQ: "Q",
  DOP: "RD$",
  EUR: "€",
};

/** 189990 → “$ 189.990” · 1499.5 → “$ 1.499,50” */
export function formatMoney(amount: number, currency = "ARS"): string {
  const decimals = Math.abs(amount - Math.round(amount)) > 0.001;
  const n = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${SYMBOL[currency] ?? currency} ${n}`;
}

/** Porcentaje de descuento de la promoción actual (o null si no hay). */
export function mlDiscountPercent(info?: MlInfo | null): number | null {
  if (!info || typeof info.amount !== "number" || typeof info.original !== "number") return null;
  if (info.amount <= 0 || info.original <= info.amount) return null;
  const pct = Math.round((1 - info.amount / info.original) * 100);
  return pct >= 1 ? pct : null;
}

/** Aviso para el visitante si el producto no se puede comprar ahora. */
export function mlStatusLabel(info?: MlInfo | null): string | null {
  switch (info?.status) {
    case "paused":
      return "Publicación pausada";
    case "closed":
    case "inactive":
      return "No disponible";
    case "no_stock":
      return "Sin stock";
    default:
      return info?.available === 0 ? "Sin stock" : null;
  }
}
