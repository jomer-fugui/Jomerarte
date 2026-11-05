"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, pages, settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getMenuConfig, getMenuModel } from "@/lib/data";
import { cleanMenuConfig, orderedGroupKeys, type MenuConfig } from "@/lib/nav";
import {
  GROUPS,
  HUBS,
  cleanPageOptions,
  customPagePath,
  getPageDef,
  getSection,
  isGroupKey,
  normalizePath,
  resolvePath,
  type PageOptions,
} from "@/lib/sections";
import { getCurrentSite } from "@/lib/site";

const RESERVED_PATHS = new Set(["admin", "api", "_next", "images", "buscar", "favicon.ico", "icon.svg", "robots.txt", "sitemap.xml"]);

function str(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function refresh() {
  revalidatePath("/", "layout");
}

async function saveMenuConfig(cfg: MenuConfig): Promise<void> {
  const value = JSON.stringify(cleanMenuConfig(cfg));
  await db
    .insert(settings)
    .values({ site: "", key: "__menu", value })
    .onConflictDoUpdate({ target: [settings.site, settings.key], set: { value } });
}

/** Crea la fila de textos de una página predeterminada con sus valores originales (si todavía no existe). */
async function ensurePageRow(key: string): Promise<void> {
  const def = getPageDef(key);
  if (!def) return;
  await db
    .insert(pages)
    .values({ key, navLabel: "", title: "", intro: def.intro, imageUrl: def.image ?? "", visible: true })
    .onConflictDoNothing();
}

/** Sube o baja una sección del menú (Servicios, Tienda, Frases…). */
export async function moveMenuGroupAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 32);
  if (site.isMain && isGroupKey(key)) {
    const cfg = await getMenuConfig();
    const list = orderedGroupKeys(cfg);
    const i = list.indexOf(key);
    const j = str(formData, "dir", 5) === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      await saveMenuConfig({ ...cfg, groups: list });
    }
  }
  refresh();
}

/** Cambia el nombre de una sección del menú. */
export async function renameMenuGroupAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 32);
  const label = str(formData, "label", 60).replace(/\s+/g, " ");
  if (!site.isMain || !isGroupKey(key)) return;
  const hub = HUBS.find((h) => h.group === key);
  if (hub) {
    // En las secciones con página principal, el nombre es el de esa página
    await ensurePageRow(hub.key);
    await db
      .update(pages)
      .set({ navLabel: label === hub.navLabel ? "" : label, updatedAt: new Date() })
      .where(eq(pages.key, hub.key));
  } else {
    const cfg = await getMenuConfig();
    const labels = { ...(cfg.labels ?? {}) };
    const original = GROUPS.find((g) => g.key === key)?.label ?? "";
    if (!label || label === original) delete labels[key];
    else labels[key] = label;
    await saveMenuConfig({ ...cfg, labels });
  }
  refresh();
}

/** Sube o baja una página dentro de su sección (predeterminadas y nuevas mezcladas). */
export async function moveMenuEntryAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 64);
  const dir = str(formData, "dir", 5) === "up" ? -1 : 1;
  if (site.isMain) {
    const [cfg, model] = await Promise.all([getMenuConfig(), getMenuModel()]);
    const group = model.groups.find((g) => g.entries.some((e) => e.key === key));
    if (group) {
      const keys = group.entries.map((e) => e.key);
      const i = keys.indexOf(key);
      const j = i + dir;
      if (j >= 0 && j < keys.length) {
        [keys[i], keys[j]] = [keys[j], keys[i]];
        await saveMenuConfig({ ...cfg, order: { ...(cfg.order ?? {}), [group.key]: keys } });
      }
    }
  } else if (/^c\d+$/.test(key)) {
    // Subdominio: el menú sigue el orden de la lista de páginas
    const list = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.section, "custom")))
      .orderBy(asc(items.sortOrder), desc(items.createdAt));
    const id = Number(key.slice(1));
    const i = list.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      await db.transaction(async (tx) => {
        for (let n = 0; n < list.length; n++) await tx.update(items).set({ sortOrder: n }).where(eq(items.id, list[n].id));
      });
    }
  }
  refresh();
}

/** Muestra u oculta una página (predeterminada o nueva). */
export async function toggleMenuEntryAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 64);
  if (/^c\d+$/.test(key)) {
    const id = Number(key.slice(1));
    const [row] = await db
      .select({ published: items.published })
      .from(items)
      .where(and(eq(items.id, id), eq(items.site, site.slug), eq(items.section, "custom")))
      .limit(1);
    if (row) await db.update(items).set({ published: !row.published, updatedAt: new Date() }).where(eq(items.id, id));
  } else if (site.isMain && key !== "custom" && getPageDef(key)) {
    await ensurePageRow(key);
    const [row] = await db.select({ visible: pages.visible }).from(pages).where(eq(pages.key, key)).limit(1);
    await db
      .update(pages)
      .set({ visible: !(row?.visible ?? true), updatedAt: new Date() })
      .where(eq(pages.key, key));
  }
  refresh();
}

/** Mueve una página a otra sección del menú. Las predeterminadas conservan su dirección. */
export async function moveEntryToGroupAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 64);
  const group = str(formData, "group", 32);
  if (!site.isMain || !isGroupKey(group)) return;
  if (/^c\d+$/.test(key)) {
    // Página nueva: su dirección cambia según la sección (ej: /Recomendacion/Emprendedores)
    const id = Number(key.slice(1));
    const [row] = await db
      .select({ slug: items.slug, menuGroup: items.menuGroup })
      .from(items)
      .where(and(eq(items.id, id), eq(items.site, ""), eq(items.section, "custom")))
      .limit(1);
    if (!row || row.menuGroup === group) return;
    const path = customPagePath(group, row.slug);
    const others = await db
      .select({ id: items.id, slug: items.slug, menuGroup: items.menuGroup })
      .from(items)
      .where(and(eq(items.site, ""), eq(items.section, "custom")));
    const taken =
      Boolean(resolvePath(path)) ||
      (group === "mas" && RESERVED_PATHS.has(row.slug.toLowerCase())) ||
      others.some((o) => o.id !== id && normalizePath(customPagePath(o.menuGroup || "mas", o.slug)) === normalizePath(path));
    if (taken) {
      redirect(
        `/admin/menu?error=${encodeURIComponent(`No se pudo mover: la dirección “${path}” ya está en uso. Cambia la dirección de la página y vuelve a intentarlo.`)}`,
      );
    }
    await db.update(items).set({ menuGroup: group, updatedAt: new Date() }).where(eq(items.id, id));
  } else {
    const def = getPageDef(key);
    if (!def || def.hub || key === "custom") return;
    await ensurePageRow(key);
    await db
      .update(pages)
      .set({ menuGroup: group === def.group ? "" : group, updatedAt: new Date() })
      .where(eq(pages.key, key));
  }
  refresh();
}

/** Vuelve al orden original del menú, los nombres originales de las secciones y su ubicación original. */
export async function resetMenuAction() {
  await requireAdmin();
  const site = await getCurrentSite();
  if (site.isMain) {
    await db.delete(settings).where(and(eq(settings.site, ""), eq(settings.key, "__menu")));
    await db.update(pages).set({ menuGroup: "" });
  }
  refresh();
  redirect("/admin/menu?ok=reset");
}

/** Guarda el orden (alfabético, más usadas o personalizado) y el estilo de las categorías de una página. */
export async function saveCategoryOptionsAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 64);
  if (!/^[a-z0-9-]{1,64}$/.test(key)) redirect("/admin");
  const sent = formData.get("__site");
  if (typeof sent === "string" && sent !== site.slug) redirect(`/admin/s/${key}`);
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(str(formData, "options", 60_000) || "{}");
  } catch {
    parsed = {};
  }
  const cat = cleanPageOptions(parsed);
  const next: PageOptions = { catSort: cat.catSort ?? "alpha", catStyle: cat.catStyle ?? "slider", catOrder: cat.catOrder ?? [] };
  if (/^c\d+$/.test(key)) {
    const id = Number(key.slice(1));
    const [row] = await db
      .select({ options: items.options })
      .from(items)
      .where(and(eq(items.id, id), eq(items.site, site.slug), eq(items.section, "custom")))
      .limit(1);
    if (row) await db.update(items).set({ options: { ...cleanPageOptions(row.options), ...next } }).where(eq(items.id, id));
  } else if (site.isMain && getSection(key)) {
    await ensurePageRow(key);
    const [row] = await db.select({ options: pages.options }).from(pages).where(eq(pages.key, key)).limit(1);
    await db
      .update(pages)
      .set({ options: { ...cleanPageOptions(row?.options), ...next }, updatedAt: new Date() })
      .where(eq(pages.key, key));
  }
  refresh();
  redirect(`/admin/s/${key}?ok=categorias`);
}
