import type { Metadata } from "next";
import type { Item } from "./data";
import type { Settings } from "./defaults";
import { excerpt, itemCategories, mediaKind, slugify, telegramUrl } from "./format";
import { safeUrl } from "./links";
import type { MlInfo } from "./ml-ref";
import { getPlatform } from "./platforms";
import type { SectionDef } from "./sections";

/**
 * SEO y datos estructurados (schema.org / JSON-LD) para Google, Bing y los asistentes con IA.
 * Este archivo no usa la base de datos: solo arma los datos a partir de lo que recibe.
 */

export type JsonLdNode = { [key: string]: unknown };

/* ═════════════ Opciones de los ajustes ═════════════ */

export const BUSINESS_TYPES = [
  { value: "Electrician", label: "Electricista (negocio local)", local: true },
  { value: "HomeAndConstructionBusiness", label: "Servicios para el hogar y la construcción", local: true },
  { value: "ProfessionalService", label: "Servicio profesional", local: true },
  { value: "LocalBusiness", label: "Negocio local (otro rubro)", local: true },
  { value: "Store", label: "Tienda", local: true },
  { value: "Organization", label: "Marca u organización (sin atención en una zona)", local: false },
  { value: "Person", label: "Persona / creador de contenido", local: false },
] as const;

export function businessTypeOf(raw: string | null | undefined): string {
  return BUSINESS_TYPES.some((b) => b.value === raw) ? (raw as string) : "Organization";
}

export function isLocalBusinessType(type: string): boolean {
  return BUSINESS_TYPES.some((b) => b.value === type && b.local);
}

export const COUNTRIES = [
  { code: "AR", name: "Argentina", currency: "ARS" },
  { code: "MX", name: "México", currency: "MXN" },
  { code: "CL", name: "Chile", currency: "CLP" },
  { code: "CO", name: "Colombia", currency: "COP" },
  { code: "UY", name: "Uruguay", currency: "UYU" },
  { code: "PE", name: "Perú", currency: "PEN" },
  { code: "PY", name: "Paraguay", currency: "PYG" },
  { code: "BO", name: "Bolivia", currency: "BOB" },
  { code: "EC", name: "Ecuador", currency: "USD" },
  { code: "VE", name: "Venezuela", currency: "VES" },
  { code: "CR", name: "Costa Rica", currency: "CRC" },
  { code: "GT", name: "Guatemala", currency: "GTQ" },
  { code: "DO", name: "República Dominicana", currency: "DOP" },
  { code: "PA", name: "Panamá", currency: "USD" },
  { code: "ES", name: "España", currency: "EUR" },
  { code: "US", name: "Estados Unidos", currency: "USD" },
  { code: "BR", name: "Brasil", currency: "BRL" },
] as const;

export function countryInfo(code: string | null | undefined) {
  const c = COUNTRIES.find((x) => x.code === code) ?? COUNTRIES[0];
  return { ...c, lang: `es-${c.code}`, ogLocale: `es_${c.code}` };
}

export const AI_POLICIES = [
  { value: "all", label: "Permitir todo (recomendado para que te encuentren y recomienden)" },
  { value: "no-training", label: "Permitir que me encuentren y recomienden, sin entrenar modelos" },
  { value: "block", label: "Bloquear a los asistentes con IA" },
] as const;

export type AiPolicy = (typeof AI_POLICIES)[number]["value"];

export function aiPolicyOf(raw: string | null | undefined): AiPolicy {
  return raw === "no-training" || raw === "block" ? raw : "all";
}

/* ═════════════ Horarios ═════════════ */

export const WEEK = [
  { key: "Mo", schema: "Monday", short: "Lun", long: "Lunes" },
  { key: "Tu", schema: "Tuesday", short: "Mar", long: "Martes" },
  { key: "We", schema: "Wednesday", short: "Mié", long: "Miércoles" },
  { key: "Th", schema: "Thursday", short: "Jue", long: "Jueves" },
  { key: "Fr", schema: "Friday", short: "Vie", long: "Viernes" },
  { key: "Sa", schema: "Saturday", short: "Sáb", long: "Sábado" },
  { key: "Su", schema: "Sunday", short: "Dom", long: "Domingo" },
] as const;

export type DayKey = (typeof WEEK)[number]["key"];
export type HoursSpec = Partial<Record<DayKey, { o: string; c: string }>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lee los horarios guardados ({"Mo":{"o":"08:00","c":"20:00"},…}); los días sin horario están cerrados. */
export function parseHours(raw: string | null | undefined): HoursSpec {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: HoursSpec = {};
    for (const d of WEEK) {
      const x = (v as Record<string, unknown>)[d.key];
      if (!x || typeof x !== "object") continue;
      const { o, c } = x as { o?: unknown; c?: unknown };
      if (typeof o === "string" && typeof c === "string" && TIME.test(o) && TIME.test(c)) out[d.key] = { o, c };
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeHours(spec: HoursSpec): string {
  return Object.keys(spec).length ? JSON.stringify(spec) : "";
}

/** “Lun a Sáb 08:00 a 20:00 · Dom 09:00 a 13:00” */
export function hoursText(spec: HoursSpec): string {
  const parts: string[] = [];
  let i = 0;
  while (i < WEEK.length) {
    const h = spec[WEEK[i].key];
    if (!h) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < WEEK.length && spec[WEEK[j + 1].key]?.o === h.o && spec[WEEK[j + 1].key]?.c === h.c) j++;
    const days =
      j === i ? WEEK[i].short : j === i + 1 ? `${WEEK[i].short} y ${WEEK[j].short}` : `${WEEK[i].short} a ${WEEK[j].short}`;
    const time = h.o === "00:00" && h.c === "23:59" ? "24 hs" : `${h.o} a ${h.c}`;
    parts.push(`${days} ${time}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

export function hoursToSchema(spec: HoursSpec): JsonLdNode[] {
  const byTime = new Map<string, string[]>();
  for (const d of WEEK) {
    const h = spec[d.key];
    if (!h) continue;
    const k = `${h.o}|${h.c}`;
    byTime.set(k, [...(byTime.get(k) ?? []), d.schema]);
  }
  return [...byTime.entries()].map(([k, days]) => {
    const [opens, closes] = k.split("|");
    return { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes };
  });
}

/* ═════════════ Utilidades ═════════════ */

export type ParsedPrice = { amount: number; currency: string; from: boolean };

/**
 * “$ 45.000” → 45000 · “Desde $ 18.000” → 18000 (desde) · “US$ 99,90” → 99.9 USD · “Gratis” → 0.
 * Devuelve null si no hay un número (“Consultar”, “Ver precio”).
 */
export function parsePrice(text: string | null | undefined, fallbackCurrency: string): ParsedPrice | null {
  const t = (text || "").trim();
  if (!t) return null;
  if (/^(gratis|gratuito|free|libre)$/i.test(t)) return { amount: 0, currency: fallbackCurrency, from: false };
  const from = /\b(desde|a partir de)\b/i.test(t);
  let currency = fallbackCurrency;
  if (/US\$|U\$S|\bUSD\b|\bdólares?\b/i.test(t)) currency = "USD";
  else if (/R\$|\bBRL\b/i.test(t)) currency = "BRL";
  else if (/€|\bEUR\b/i.test(t)) currency = "EUR";
  else if (/S\/|\bPEN\b/i.test(t)) currency = "PEN";
  const m = t.match(/\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/);
  if (!m) return null;
  const raw = m[0];
  const n = /^\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?$/.test(raw)
    ? raw.replace(/[.\s]/g, "").replace(",", ".")
    : raw.replace(",", ".");
  const amount = Number(n);
  return Number.isFinite(amount) && amount >= 0 ? { amount, currency, from } : null;
}

/** Coordenadas de un enlace de Google Maps (si las tiene). */
export function geoFromMapsUrl(url: string | null | undefined): { lat: number; lng: number } | null {
  const u = url || "";
  const patterns = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|query|center|destination)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: round(lat), lng: round(lng) };
    }
  }
  return null;
}

function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

export function geoOf(s: Pick<Settings, "latitude" | "longitude" | "mapsUrl">): { lat: number; lng: number } | null {
  const lat = Number(String(s.latitude || "").replace(",", "."));
  const lng = Number(String(s.longitude || "").replace(",", "."));
  if (s.latitude && s.longitude && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat: round(lat), lng: round(lng) };
  }
  return geoFromMapsUrl(s.mapsUrl);
}

/** “Quilmes, Berazategui; CABA” → ["Quilmes", "Berazategui", "CABA"] */
export function splitList(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw || "").split(/[,;\n]+/)) {
    const v = part.replace(/\s+/g, " ").trim();
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
    if (out.length >= 50) break;
  }
  return out;
}

export function absUrl(base: string, url: string | null | undefined): string | undefined {
  const u = (url || "").trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${base}${u}`;
  return undefined;
}

export function detailPath(sectionPath: string, item: { id: number; title: string }): string {
  return `${sectionPath}/${item.id}-${slugify(item.title) || "ver"}`;
}

/** Acepta el código o la etiqueta completa (<meta name="…" content="CÓDIGO" />). */
export function verificationCode(raw: string | null | undefined): string {
  const s = (raw || "").trim();
  const m = s.match(/content=["']([^"']+)["']/i);
  return (m ? m[1] : s).replace(/[^A-Za-z0-9_\-=.:+/]/g, "").slice(0, 200);
}

export function twitterHandle(url: string | null | undefined): string | undefined {
  const m = (url || "").match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i);
  return m ? `@${m[1]}` : undefined;
}

export function sameAsLinks(s: Settings, extra: string[], isMain: boolean): string[] {
  const list = [
    s.instagram,
    s.facebook,
    s.youtube,
    s.tiktok,
    s.twitter,
    telegramUrl(s.telegram),
    s.mapsUrl,
    ...(isMain ? [s.storeMercadoLibre, s.storeHotmart, s.storeAliExpress, s.storeAmazon, s.storeOther] : []),
    ...extra,
  ];
  const out: string[] = [];
  for (const raw of list) {
    const u = (raw || "").trim();
    if (/^https?:\/\/\S+$/i.test(u) && !out.includes(u)) out.push(u);
    if (out.length >= 30) break;
  }
  return out;
}

/** Quita valores vacíos (undefined, "", [], objetos sin datos) para que el JSON-LD quede limpio. */
export function clean<T>(value: T): T {
  return cleanValue(value) as T;
}

function cleanValue(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() ? v : undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
  if (Array.isArray(v)) {
    const arr = v.map(cleanValue).filter((x) => x !== undefined);
    return arr.length ? arr : undefined;
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const c = cleanValue(x);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).some((k) => k !== "@type" && k !== "@context") ? out : undefined;
  }
  return v;
}

/** JSON seguro para insertar en <script type="application/ld+json"> (evita inyección de HTML). */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function jsonLdGraph(nodes: (JsonLdNode | null | undefined)[]): JsonLdNode | null {
  const list = nodes.map((n) => (n ? clean(n) : undefined)).filter((n): n is JsonLdNode => Boolean(n));
  return list.length ? { "@context": "https://schema.org", "@graph": list } : null;
}

function iso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const t = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
}

/* ═════════════ Contexto del sitio ═════════════ */

export type SeoContext = {
  base: string;
  isMain: boolean;
  siteName: string;
  lang: string;
  locale: string;
  currency: string;
  countryCode: string;
  businessType: string;
  identityId: string;
  authorId: string;
  websiteId: string;
  areaServed: string[];
  sameAs: string[];
  settings: Settings;
};

export function makeSeoContext(base: string, s: Settings, isMain: boolean, extraSameAs: string[] = []): SeoContext {
  const type = businessTypeOf(s.businessType);
  const country = countryInfo(s.country);
  const identityId = `${base}/#${type === "Person" ? "persona" : "negocio"}`;
  const owner = s.ownerName.trim();
  return {
    base,
    isMain,
    siteName: s.siteName,
    lang: country.lang,
    locale: country.ogLocale,
    currency: country.currency,
    countryCode: country.code,
    businessType: type,
    identityId,
    authorId: type !== "Person" && owner ? `${base}/#autor` : identityId,
    websiteId: `${base}/#sitio`,
    areaServed: splitList(s.serviceArea),
    sameAs: sameAsLinks(s, extraSameAs, isMain),
    settings: s,
  };
}

/** Datos del sitio: WebSite (con buscador), el negocio o la persona y el autor. Van en todas las páginas. */
export function siteGraph(ctx: SeoContext): JsonLdNode[] {
  const s = ctx.settings;
  const base = ctx.base;
  const person = ctx.businessType === "Person";
  const local = isLocalBusinessType(ctx.businessType);
  const description = excerpt(s.seoDescription || s.heroText || s.tagline, 300) || undefined;
  const logo = absUrl(base, s.logoUrl || s.logoLightUrl) ?? `${base}/icon.svg`;
  const hero = absUrl(base, s.heroImage);
  const digits = s.whatsapp.replace(/\D/g, "");
  const telephone = s.phone.trim() || (digits ? `+${digits}` : undefined);
  const owner = s.ownerName.trim();
  const hasPlace = Boolean(s.city || s.region || s.streetAddress);
  const address = {
    "@type": "PostalAddress",
    streetAddress: person ? undefined : s.streetAddress,
    addressLocality: s.city,
    addressRegion: s.region,
    postalCode: person ? undefined : s.postalCode,
    addressCountry: ctx.countryCode,
  };
  const geo = geoOf(s);

  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": ctx.websiteId,
    url: `${base}/`,
    name: s.siteName,
    description,
    inLanguage: ctx.lang,
    publisher: { "@id": ctx.identityId },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/buscar?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const identity: JsonLdNode = person
    ? {
        "@type": "Person",
        "@id": ctx.identityId,
        name: owner || s.siteName,
        alternateName: owner && owner !== s.siteName ? s.siteName : undefined,
        url: `${base}/`,
        image: logo,
        description,
        jobTitle: s.tagline || undefined,
        email: s.email || undefined,
        telephone,
        address: hasPlace ? address : undefined,
        sameAs: ctx.sameAs,
        knowsLanguage: "es",
      }
    : {
        "@type": ctx.businessType,
        "@id": ctx.identityId,
        name: s.siteName,
        url: `${base}/`,
        logo: { "@type": "ImageObject", url: logo },
        image: [hero, logo],
        description,
        slogan: s.tagline || undefined,
        telephone,
        email: s.email || undefined,
        address: hasPlace ? address : undefined,
        areaServed: ctx.areaServed.length ? ctx.areaServed : s.city || undefined,
        sameAs: ctx.sameAs,
        founder: owner ? { "@id": ctx.authorId } : undefined,
        knowsLanguage: "es",
        contactPoint:
          telephone || s.email
            ? {
                "@type": "ContactPoint",
                contactType: "customer service",
                telephone,
                email: s.email || undefined,
                areaServed: ctx.countryCode,
                availableLanguage: ["es"],
              }
            : undefined,
        ...(local
          ? {
              geo: geo ? { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng } : undefined,
              hasMap: s.mapsUrl || undefined,
              openingHoursSpecification: hoursToSchema(parseHours(s.openingHours)),
              priceRange: s.priceRange || undefined,
            }
          : {}),
      };

  const nodes: JsonLdNode[] = [website, identity];
  if (!person && owner) {
    nodes.push({ "@type": "Person", "@id": ctx.authorId, name: owner, worksFor: { "@id": ctx.identityId }, url: `${base}/` });
  }
  return nodes.map((n) => clean(n));
}

/** Catálogo de servicios del negocio (se agrega en la portada). */
export function homeCatalogNode(ctx: SeoContext, services: { title: string; intro: string; path: string }[]): JsonLdNode | null {
  if (services.length === 0) return null;
  return clean({
    "@id": ctx.identityId,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Servicios de ${ctx.siteName}`,
      itemListElement: services.map((sv) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: sv.title,
          description: excerpt(sv.intro, 200) || undefined,
          url: `${ctx.base}${sv.path}`,
          provider: { "@id": ctx.identityId },
          areaServed: ctx.areaServed.length ? ctx.areaServed : undefined,
        },
      })),
    },
  });
}

/* ═════════════ Publicaciones ═════════════ */

function imagesOf(base: string, it: Item): string[] {
  const out: string[] = [];
  const main = absUrl(base, it.imageUrl);
  if (main) out.push(main);
  for (const g of it.gallery ?? []) {
    if (out.length >= 6) break;
    if (mediaKind(g) !== "image") continue;
    const u = absUrl(base, g);
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

function descOf(it: Item, max = 300): string | undefined {
  const text = it.subtitle && it.content ? `${it.subtitle}. ${it.content}` : it.subtitle || it.content;
  return excerpt(text, max) || undefined;
}

const AVAILABILITY = {
  in: "https://schema.org/InStock",
  out: "https://schema.org/OutOfStock",
  gone: "https://schema.org/Discontinued",
};

function availabilityOf(ml: MlInfo | null): string {
  if (!ml) return AVAILABILITY.in;
  if (ml.status === "closed" || ml.status === "inactive") return AVAILABILITY.gone;
  if (ml.status === "no_stock" || ml.status === "paused" || ml.available === 0) return AVAILABILITY.out;
  return AVAILABILITY.in;
}

/** Oferta con precio numérico (el precio de Mercado Libre si está vinculado). Sin precio no hay oferta. */
function offerOf(ctx: SeoContext, it: Item, url: string, opts: { seller?: boolean; unit?: boolean } = {}): JsonLdNode | undefined {
  const ml = it.mlSync ? it.mlInfo : null;
  const price: ParsedPrice | null =
    ml && typeof ml.amount === "number" && ml.amount > 0
      ? { amount: ml.amount, currency: ml.currency || ctx.currency, from: false }
      : parsePrice(it.price, ctx.currency);
  if (!price) return undefined;
  const platform = getPlatform(it.platform);
  const external = Boolean(platform && !["propio", "web", "otro"].includes(platform.key));
  const unitText = opts.unit && it.unit ? it.unit : undefined;
  return clean({
    "@type": "Offer",
    url,
    price: price.amount,
    priceCurrency: price.currency,
    availability: availabilityOf(ml),
    priceSpecification:
      price.from || unitText
        ? {
            "@type": unitText ? "UnitPriceSpecification" : "PriceSpecification",
            ...(price.from ? { minPrice: price.amount } : { price: price.amount }),
            priceCurrency: price.currency,
            unitText,
          }
        : undefined,
    seller: opts.seller === false ? undefined : external ? { "@type": "Organization", name: platform?.label } : { "@id": ctx.identityId },
  });
}

function reviewedType(section: SectionDef, it: Item): string {
  if (section.key === "rec-marcas") return "Organization";
  if (section.key === "rec-productos" || section.key === "truchas-productos") return "Product";
  if (section.key === "rec-paginas") return "WebSite";
  return it.location ? "LocalBusiness" : "Organization";
}

/** Una publicación como dato estructurado, según el tipo de página. */
export function itemNode(
  ctx: SeoContext,
  section: SectionDef,
  it: Item,
  o: { position?: number; pageTitle?: string } = {},
): JsonLdNode | null {
  const pageUrl = section.detail ? `${ctx.base}${detailPath(section.path, it)}` : `${ctx.base}${section.path}`;
  const id = section.detail ? `${pageUrl}#item` : `${pageUrl}#item-${it.id}`;
  const name = it.title || undefined;
  const description = descOf(it);
  const images = imagesOf(ctx.base, it);
  const image = images.length ? images : undefined;
  const cats = itemCategories(it);
  const keywords = cats.length ? cats.join(", ") : undefined;
  const author = { "@id": ctx.authorId };
  const publisher = { "@id": ctx.identityId };
  const published = iso(it.createdAt);
  const modified = iso(it.updatedAt);
  const external = absUrl(ctx.base, safeUrl(it.linkUrl));
  const downloads = (it.links ?? []).map((l) => absUrl(ctx.base, safeUrl(l.url))).filter((u): u is string => Boolean(u));
  const partOf = o.pageTitle ? { "@type": "CreativeWork", name: o.pageTitle } : undefined;

  switch (section.layout) {
    case "services":
      if (section.key === "cursos") {
        return clean({
          "@type": "Course",
          "@id": id,
          name,
          description: description ?? name,
          url: pageUrl,
          image,
          provider: publisher,
          offers: offerOf(ctx, it, pageUrl),
          inLanguage: ctx.lang,
          keywords,
        });
      }
      return clean({
        "@type": "Service",
        "@id": id,
        name,
        description,
        url: pageUrl,
        image,
        serviceType: o.pageTitle,
        provider: publisher,
        areaServed: ctx.areaServed.length ? ctx.areaServed : undefined,
        offers: offerOf(ctx, it, pageUrl, { unit: true }),
        category: keywords,
      });
    case "products": {
      const offer = offerOf(ctx, it, pageUrl);
      if (!offer) return null;
      return clean({
        "@type": "Product",
        "@id": id,
        name,
        description,
        url: pageUrl,
        image,
        sku: it.mlId || undefined,
        category: keywords,
        offers: offer,
      });
    }
    case "games":
      return clean({
        "@type": "VideoGame",
        "@id": id,
        name,
        description,
        url: pageUrl,
        image,
        genre: cats,
        gamePlatform: it.subtitle || undefined,
        applicationCategory: "Game",
        operatingSystem: it.subtitle || undefined,
        fileSize: it.unit || undefined,
        author: it.location ? { "@type": "Organization", name: it.location } : undefined,
        publisher,
        downloadUrl: downloads.length ? downloads : undefined,
        offers: offerOf(ctx, it, pageUrl, { seller: false }),
        review:
          it.rating > 0
            ? {
                "@type": "Review",
                reviewRating: { "@type": "Rating", ratingValue: it.rating, bestRating: 5, worstRating: 1 },
                author,
              }
            : undefined,
        datePublished: published,
        inLanguage: ctx.lang,
      });
    case "recommend":
    case "bad": {
      const type = reviewedType(section, it);
      return clean({
        "@type": "Review",
        "@id": id,
        name,
        reviewBody: excerpt(it.content, 600) || undefined,
        itemReviewed: {
          "@type": type,
          name: it.title,
          description: it.subtitle || undefined,
          image: images[0],
          url: external,
          ...(type === "LocalBusiness" ? { address: it.location || undefined } : {}),
        },
        reviewRating:
          it.rating > 0 ? { "@type": "Rating", ratingValue: it.rating, bestRating: 5, worstRating: 1 } : undefined,
        author,
        publisher,
        datePublished: published,
        keywords,
      });
    }
    case "quotes":
      return clean({
        "@type": "Quotation",
        "@id": id,
        text: it.content,
        creator: it.title ? { "@type": "Person", name: it.title } : author,
        genre: cats,
        inLanguage: ctx.lang,
        image: images[0],
      });
    case "colmos":
      return clean({ "@type": "Question", "@id": id, name: it.title, acceptedAnswer: { "@type": "Answer", text: it.content } });
    case "poems":
      return clean({
        "@type": "CreativeWork",
        "@id": id,
        name,
        genre: ["Poesía", ...cats],
        text: it.content,
        author,
        image,
        inLanguage: ctx.lang,
        datePublished: published,
      });
    case "links":
      return clean({ "@type": "WebSite", "@id": id, name, description, url: external, image: images[0] });
    case "songs":
      return clean({
        "@type": "MusicComposition",
        "@id": id,
        name,
        url: pageUrl,
        image,
        genre: it.subtitle || undefined,
        composer: author,
        lyricist: author,
        lyrics: it.content ? { "@type": "CreativeWork", text: it.content } : undefined,
        sameAs: external,
        inLanguage: ctx.lang,
      });
    case "characters":
      return clean({
        "@type": "CreativeWork",
        "@id": id,
        name,
        description,
        url: pageUrl,
        image,
        genre: "Personaje",
        keywords,
        creator: author,
        isPartOf: partOf,
      });
    case "story":
      return clean({
        "@type": "Chapter",
        "@id": id,
        name,
        alternativeHeadline: it.subtitle || undefined,
        description: excerpt(it.content, 300) || undefined,
        url: pageUrl,
        image,
        position: o.position,
        author,
        isPartOf: partOf,
        datePublished: published,
        inLanguage: ctx.lang,
      });
    case "devlog":
      return clean({
        "@type": "BlogPosting",
        "@id": id,
        headline: (it.title || "").slice(0, 110),
        description,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        image,
        datePublished: published,
        dateModified: modified,
        author,
        publisher,
        articleSection: cats[0],
        keywords,
        inLanguage: ctx.lang,
      });
    case "inventions":
      return clean({
        "@type": "CreativeWork",
        "@id": id,
        name,
        description,
        url: pageUrl,
        image,
        creator: author,
        keywords,
        datePublished: published,
        dateModified: modified,
        inLanguage: ctx.lang,
      });
    case "prices": {
      const price = parsePrice(it.price, ctx.currency);
      return clean({
        "@type": "Offer",
        "@id": id,
        name,
        description: it.subtitle || undefined,
        price: price?.amount,
        priceCurrency: price?.currency,
        priceSpecification: price
          ? {
              "@type": "UnitPriceSpecification",
              ...(price.from ? { minPrice: price.amount } : { price: price.amount }),
              priceCurrency: price.currency,
              unitText: it.unit || undefined,
            }
          : undefined,
        category: it.category || undefined,
        itemOffered: { "@type": section.key === "precios-productos" ? "Product" : "Service", name: it.title },
        seller: publisher,
      });
    }
    default:
      return null;
  }
}

/* ═════════════ Páginas ═════════════ */

export function webPageNode(
  ctx: SeoContext,
  o: { url: string; name: string; description?: string; image?: string; dateModified?: string },
): JsonLdNode {
  return clean({
    "@type": "WebPage",
    "@id": `${o.url}#webpage`,
    url: o.url,
    name: o.name,
    description: o.description,
    inLanguage: ctx.lang,
    isPartOf: { "@id": ctx.websiteId },
    about: { "@id": ctx.identityId },
    primaryImageOfPage: o.image ? { "@type": "ImageObject", url: o.image } : undefined,
    dateModified: o.dateModified,
  });
}

export function breadcrumbNode(ctx: SeoContext, crumbs: { href: string; label: string }[]): JsonLdNode | null {
  const list = crumbs.filter((c) => c.label);
  if (list.length < 2) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: list.map((c, i) => clean({ "@type": "ListItem", position: i + 1, name: c.label, item: absUrl(ctx.base, c.href) })),
  };
}

/** Página con una lista de publicaciones: CollectionPage + ItemList (o FAQPage / OfferCatalog). */
export function listPageNodes(
  ctx: SeoContext,
  o: { section: SectionDef; items: Item[]; url: string; name: string; description?: string; image?: string },
): JsonLdNode[] {
  const list = o.items.slice(0, 100);
  const newest = o.items.reduce<Date | null>((m, it) => (!m || it.updatedAt > m ? it.updatedAt : m), null);
  const page = webPageNode(ctx, { url: o.url, name: o.name, description: o.description, image: o.image, dateModified: iso(newest) });
  const nodes = (fn: (it: Item, i: number) => JsonLdNode | null) => list.map(fn).filter((n): n is JsonLdNode => Boolean(n));

  if (o.section.layout === "colmos") {
    return [clean({ ...page, "@type": "FAQPage", mainEntity: nodes((it) => itemNode(ctx, o.section, it)) })];
  }
  if (o.section.layout === "prices") {
    const offers = nodes((it) => itemNode(ctx, o.section, it));
    return [
      clean({
        ...page,
        "@type": "CollectionPage",
        mainEntity: offers.length ? { "@type": "OfferCatalog", name: o.name, numberOfItems: offers.length, itemListElement: offers } : undefined,
      }),
    ];
  }
  const elements = nodes((it, i) => {
    if (o.section.detail) {
      return clean({ "@type": "ListItem", position: i + 1, url: `${ctx.base}${detailPath(o.section.path, it)}`, name: it.title || undefined });
    }
    const node = itemNode(ctx, o.section, it, { position: i + 1, pageTitle: o.name });
    return node ? { "@type": "ListItem", position: i + 1, item: node } : null;
  });
  return [
    clean({
      ...page,
      "@type": "CollectionPage",
      mainEntity: elements.length
        ? { "@type": "ItemList", name: o.name, numberOfItems: o.items.length, itemListElement: elements }
        : undefined,
    }),
  ];
}

/** Página principal de una sección (Servicios, Tienda…): lista de sus páginas. */
export function hubPageNodes(
  ctx: SeoContext,
  o: { url: string; name: string; description?: string; image?: string; entries: { title: string; path: string; intro: string }[] },
): JsonLdNode[] {
  const page = webPageNode(ctx, { url: o.url, name: o.name, description: o.description, image: o.image });
  return [
    clean({
      ...page,
      "@type": "CollectionPage",
      mainEntity: o.entries.length
        ? {
            "@type": "ItemList",
            name: o.name,
            numberOfItems: o.entries.length,
            itemListElement: o.entries.map((e, i) =>
              clean({
                "@type": "ListItem",
                position: i + 1,
                url: `${ctx.base}${e.path}`,
                name: e.title,
                description: excerpt(e.intro, 160) || undefined,
              }),
            ),
          }
        : undefined,
    }),
  ];
}

/** Página de una publicación. Si el tipo no tiene datos propios (o falta el precio), se describe como página web. */
export function detailPageNodes(ctx: SeoContext, section: SectionDef, it: Item, pageTitle?: string): JsonLdNode[] {
  const node = itemNode(ctx, section, it, { pageTitle });
  if (node) return [node];
  return [
    webPageNode(ctx, {
      url: `${ctx.base}${detailPath(section.path, it)}`,
      name: it.title,
      description: descOf(it),
      image: imagesOf(ctx.base, it)[0],
      dateModified: iso(it.updatedAt),
    }),
  ];
}

export function itemImage(base: string, it: Item): string | undefined {
  return imagesOf(base, it)[0];
}

export function itemDescription(it: Item, max = 160): string | undefined {
  return descOf(it, max);
}

/* ═════════════ Metadatos de cada página ═════════════ */

export function pageMetadata(o: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  siteName: string;
  locale: string;
  /** Usuario de X (@usuario): cada página reemplaza el bloque “twitter” del sitio, así que se repite aquí */
  handle?: string;
  article?: { publishedTime?: string; modifiedTime?: string };
}): Metadata {
  const description = o.description ? excerpt(o.description, 160) || undefined : undefined;
  const images = o.image ? [{ url: o.image }] : undefined;
  const common = { url: o.path, siteName: o.siteName, locale: o.locale, title: o.title, description, images };
  const meta: Metadata = {
    alternates: { canonical: o.path },
    openGraph: o.article
      ? { ...common, type: "article", publishedTime: o.article.publishedTime, modifiedTime: o.article.modifiedTime }
      : { ...common, type: "website" },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: o.title,
      description,
      images: o.image ? [o.image] : undefined,
      site: o.handle,
      creator: o.handle,
    },
  };
  if (o.title) meta.title = o.title;
  if (description) meta.description = description;
  return meta;
}
