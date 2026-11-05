import crypto from "node:crypto";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items, settings } from "@/db/schema";
import type { Item } from "./data";
import { rootDomain, siteBaseUrl } from "./hosts";
import { describeCustomPage, getSection } from "./sections";
import { detailPath } from "./seo";
import { ensureSeeded } from "./seed";

/**
 * IndexNow: avisa al instante a Bing (que alimenta a ChatGPT y Copilot), Yandex y otros buscadores
 * cuando publicas o cambias algo, para que lo vean sin esperar a que vuelvan a pasar por tu sitio.
 */

const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const KEY_SETTING = "__indexnow_key";

export function indexNowStatus(): { enabled: boolean; reason?: string } {
  if (!siteBaseUrl()) {
    return {
      enabled: false,
      reason: "Falta configurar en Vercel la variable NEXT_PUBLIC_SITE_URL con tu dominio (ej: https://jomerarte.com).",
    };
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { enabled: false, reason: "Solo funciona en el sitio publicado (producción), no en las vistas previas de Vercel." };
  }
  if (!isDatabaseConfigured()) return { enabled: false, reason: "Falta conectar la base de datos." };
  return { enabled: true };
}

/** Clave pública de IndexNow (se crea sola la primera vez). Se publica en /{clave}.txt */
export async function getIndexNowKey(): Promise<string> {
  await ensureSeeded();
  const read = async () =>
    (
      await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.site, ""), eq(settings.key, KEY_SETTING)))
        .limit(1)
    )[0]?.value;
  const existing = await read();
  if (existing) return existing;
  const fresh = `jomer-${crypto.randomBytes(16).toString("hex")}`;
  await db.insert(settings).values({ site: "", key: KEY_SETTING, value: fresh }).onConflictDoNothing();
  return (await read()) ?? fresh;
}

/** Dominio público de un sitio: "" → jomerarte.com · "juegos" → juegos.jomerarte.com */
export function hostForSite(site: string): string | null {
  const base = siteBaseUrl();
  if (!base) return null;
  if (!site) return new URL(base).host;
  const root = rootDomain();
  return root ? `${site}.${root}` : null;
}

export type IndexNowResult = { ok: boolean; status: number; count: number; message: string };

export async function submitToIndexNow(site: string, pathsOrUrls: string[]): Promise<IndexNowResult> {
  const status = indexNowStatus();
  if (!status.enabled) return { ok: false, status: 0, count: 0, message: status.reason ?? "IndexNow no está activo." };
  const host = hostForSite(site);
  if (!host) return { ok: false, status: 0, count: 0, message: "No se conoce el dominio de este sitio." };
  const urls: string[] = [];
  for (const p of pathsOrUrls) {
    let u: URL;
    try {
      u = new URL(p, `https://${host}`);
    } catch {
      continue;
    }
    if (u.host !== host) continue;
    u.protocol = "https:";
    u.hash = "";
    const s = u.toString();
    if (!urls.includes(s)) urls.push(s);
    if (urls.length >= 10_000) break;
  }
  if (urls.length === 0) return { ok: false, status: 0, count: 0, message: "No hay direcciones de este sitio para enviar." };

  const key = await getIndexNowKey();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const ok = res.status === 200 || res.status === 202;
    const message = ok
      ? `Listo: se avisó de ${urls.length} ${urls.length === 1 ? "dirección" : "direcciones"} a Bing y a los buscadores de IndexNow.`
      : res.status === 403
        ? "IndexNow todavía no pudo comprobar la clave de tu sitio. Intenta de nuevo en unos minutos."
        : res.status === 422
          ? "Las direcciones no coinciden con el dominio del sitio."
          : res.status === 429
            ? "Demasiados avisos seguidos: intenta más tarde."
            : `IndexNow respondió con el código ${res.status}.`;
    return { ok, status: res.status, count: ok ? urls.length : 0, message };
  } catch {
    return { ok: false, status: 0, count: 0, message: "No se pudo conectar con IndexNow." };
  }
}

/** Avisa en segundo plano (después de responder al navegador) que cambiaron estas páginas. */
export function notifySearchEngines(site: string, paths: string[]): void {
  if (paths.length === 0 || !indexNowStatus().enabled) return;
  try {
    after(async () => {
      const r = await submitToIndexNow(site, paths).catch(() => null);
      if (r && !r.ok) console.warn("[indexnow]", r.message);
    });
  } catch {
    // fuera de una petición: no se avisa
  }
}

type ItemRef = Pick<Item, "id" | "site" | "section" | "title"> & Partial<Item>;

/** Direcciones públicas de una publicación: su página propia (si tiene) y la lista donde aparece. */
export async function itemPublicPaths(row: ItemRef): Promise<string[]> {
  if (row.section === "custom") {
    if (row.slug === undefined) return [];
    return [describeCustomPage(row as Item, row.site === "").path];
  }
  const fixed = row.site === "" ? getSection(row.section) : undefined;
  if (fixed) return fixed.detail ? [fixed.path, detailPath(fixed.path, row)] : [fixed.path];
  if (/^c\d+$/.test(row.section)) {
    const [page] = await db
      .select()
      .from(items)
      .where(and(eq(items.id, Number(row.section.slice(1))), eq(items.section, "custom")))
      .limit(1);
    if (!page) return [];
    const info = describeCustomPage(page, page.site === "");
    return info.def?.detail ? [info.path, detailPath(info.path, row)] : [info.path];
  }
  return [];
}

export async function notifyItemChange(row: ItemRef): Promise<void> {
  if (!indexNowStatus().enabled) return;
  try {
    notifySearchEngines(row.site, [...(await itemPublicPaths(row)), "/"]);
  } catch {
    // si falla, los buscadores lo verán igual en su próxima visita
  }
}
