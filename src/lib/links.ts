import type { IconName } from "./sections";

/** Enlace con nombre personalizado (ej: “Descargar por Mediafire”). */
export type ItemLink = { label: string; url: string };

export const MAX_LINKS = 20;

/**
 * Deja solo direcciones seguras: https://…, http://…, /ruta-interna, mailto: y tel:.
 * “mediafire.com/archivo” se completa como “https://mediafire.com/archivo”.
 * Devuelve "" si la dirección no es válida (por ejemplo “javascript:…”).
 */
export function safeUrl(raw: string): string {
  const url = (raw || "").trim();
  if (!url) return "";
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^\/(?!\/)[^\s]*$/.test(url)) return url;
  if (/^(mailto|tel):[^\s]+$/i.test(url)) return url;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#][^\s]*)?$/i.test(url)) return `https://${url}`;
  return "";
}

export interface LinkProvider {
  key: string;
  name: string;
  color: string;
  icon: IconName;
  /** Nombre automático si el botón no tiene uno */
  defaultLabel: string;
}

const PROVIDERS: { match: RegExp; p: Omit<LinkProvider, "defaultLabel"> & { verb?: string } }[] = [
  { match: /(^|\.)mediafire\.com$/, p: { key: "mediafire", name: "MediaFire", color: "#1299F3", icon: "download", verb: "Descargar por" } },
  { match: /(^|\.)(drive|docs)\.google\.com$/, p: { key: "drive", name: "Google Drive", color: "#1FA463", icon: "drive", verb: "Descargar por" } },
  { match: /(^|\.)mega\.(nz|io|co\.nz)$/, p: { key: "mega", name: "MEGA", color: "#D9272E", icon: "cloud", verb: "Descargar por" } },
  { match: /(^|\.)dropbox\.com$/, p: { key: "dropbox", name: "Dropbox", color: "#0061FF", icon: "cloud", verb: "Descargar por" } },
  { match: /(^|\.)(onedrive\.live\.com|1drv\.ms|sharepoint\.com)$/, p: { key: "onedrive", name: "OneDrive", color: "#0078D4", icon: "cloud", verb: "Descargar por" } },
  { match: /(^|\.)(gofile\.io|pixeldrain\.com|4shared\.com|terabox\.com|uptobox\.com|zippyshare\.com|krakenfiles\.com|workupload\.com|archive\.org)$/, p: { key: "files", name: "Descarga directa", color: "#7C3AED", icon: "download", verb: "Descargar por" } },
  { match: /(^|\.)github\.com$/, p: { key: "github", name: "GitHub", color: "#3f3f46", icon: "code", verb: "Ver en" } },
  { match: /(^|\.)itch\.io$/, p: { key: "itch", name: "itch.io", color: "#FA5C5C", icon: "gamepad", verb: "Descargar en" } },
  { match: /(^|\.)(store\.steampowered\.com|steamcommunity\.com)$/, p: { key: "steam", name: "Steam", color: "#1b2838", icon: "gamepad", verb: "Ver en" } },
  { match: /(^|\.)(play\.google\.com)$/, p: { key: "playstore", name: "Google Play", color: "#01875F", icon: "smartphone", verb: "Descargar en" } },
  { match: /(^|\.)(apps\.apple\.com)$/, p: { key: "appstore", name: "App Store", color: "#0D96F6", icon: "smartphone", verb: "Descargar en" } },
  { match: /(^|\.)(youtube\.com|youtu\.be)$/, p: { key: "youtube", name: "YouTube", color: "#FF0000", icon: "play", verb: "Ver en" } },
  { match: /(^|\.)(t\.me|telegram\.me|telegram\.org)$/, p: { key: "telegram", name: "Telegram", color: "#26A5E4", icon: "chat", verb: "Abrir en" } },
  { match: /(^|\.)(discord\.gg|discord\.com)$/, p: { key: "discord", name: "Discord", color: "#5865F2", icon: "chat", verb: "Unirse en" } },
  { match: /(^|\.)(wa\.me|whatsapp\.com)$/, p: { key: "whatsapp", name: "WhatsApp", color: "#25D366", icon: "chat", verb: "Abrir en" } },
];

/** Reconoce el servicio del enlace (Mediafire, Google Drive, MEGA, Steam…) para mostrar su color e ícono. */
export function linkProvider(raw: string): LinkProvider {
  const url = safeUrl(raw);
  if (url.startsWith("/")) return { key: "internal", name: "Este sitio", color: "var(--accent)", icon: "link", defaultLabel: "Ver más" };
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    host = "";
  }
  for (const { match, p } of PROVIDERS) {
    if (host && match.test(host)) {
      const { verb, ...rest } = p;
      return { ...rest, defaultLabel: `${verb ?? "Abrir en"} ${p.name}` };
    }
  }
  return { key: "web", name: host || "Enlace", color: "var(--accent)", icon: "globe", defaultLabel: "Abrir enlace" };
}

/** Dominio para mostrar debajo del botón: “mediafire.com”. */
export function linkHost(raw: string): string {
  const url = safeUrl(raw);
  if (!url || url.startsWith("/")) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Valida y limpia la lista de enlaces que llega desde el panel. */
export function cleanLinks(value: unknown): ItemLink[] {
  if (!Array.isArray(value)) return [];
  const out: ItemLink[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const url = safeUrl(typeof r.url === "string" ? r.url.slice(0, 2000) : "");
    if (!url) continue;
    const label = (typeof r.label === "string" ? r.label : "").replace(/\s+/g, " ").trim().slice(0, 80);
    out.push({ label: label || linkProvider(url).defaultLabel, url });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}

/** Sugerencias rápidas de nombres para los botones. */
export const LINK_LABEL_SUGGESTIONS = [
  "Descargar por Mediafire",
  "Descargar por Google Drive",
  "Descargar por MEGA",
  "Descargar (servidor alternativo)",
  "Ver tráiler",
  "Página oficial",
];
