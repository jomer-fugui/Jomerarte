import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items, pages, settings } from "@/db/schema";
import { DEFAULT_SETTINGS, subsiteDefaults, type Settings } from "./defaults";
import { buildMenuModel, cleanMenuConfig, type MenuConfig, type MenuModel } from "./nav";
import {
  ALL_PAGE_DEFS,
  cleanPageOptions,
  describeCustomPage,
  getSection,
  isGroupKey,
  isIconName,
  normalizePath,
  type CustomPageInfo,
  type GroupKey,
  type IconName,
  type PageOptions,
  type SectionDef,
} from "./sections";
import { ensureSeeded } from "./seed";
import { getCurrentSite } from "./site";
import { PAGE_REVALIDATE, TAG_CONTENT } from "./cache-tags";

export type Item = typeof items.$inferSelect;

export type PageText = {
  key: string;
  navLabel: string;
  title: string;
  intro: string;
  imageUrl: string;
  visible: boolean;
  /** Ícono, sección del menú y opciones (orden de las categorías), ya resueltos */
  icon: IconName;
  group: GroupKey;
  options: PageOptions;
};

/** Página creada desde el panel, con su tipo, ubicación y dirección ya calculados. */
export type CustomSection = CustomPageInfo & { item: Item; visible: boolean };

/* ════════════════════════════════════════════════════════════════════════════
 * LECTURAS
 *
 * Cada lectura recibe el SITIO como parámetro ("" = principal). Así el panel puede pedir los datos
 * frescos de cada sitio y el sitio público puede guardarlos en caché sin depender de cookies ni
 * de cabeceras HTTP: eso es lo que permite que las páginas se sirvan desde la caché.
 * ══════════════════════════════════════════════════════════════════════════════ */

/** Ajustes del sitio: los guardados en el panel sobre los valores por defecto. */
const loadSettings = cache(async (slug: string): Promise<Settings> => {
  const out: Settings = slug ? subsiteDefaults(slug) : { ...DEFAULT_SETTINGS };
  if (!isDatabaseConfigured()) return out;
  try {
    await ensureSeeded();
    const rows = await db.select().from(settings).where(eq(settings.site, slug));
    for (const row of rows) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, row.key)) {
        (out as Record<string, string>)[row.key] = row.value;
      }
    }
  } catch (err) {
    console.error("[settings]", err instanceof Error ? err.message : err);
  }
  return out;
});

/** Ajustes frescos (panel): siempre los recién guardados. */
export const freshSettings = loadSettings;

/** Páginas personalizadas del sitio (publicadas y ocultas), en el orden del panel. */
const loadCustomSections = cache(async (slug: string): Promise<CustomSection[]> => {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await loadItems(slug, "custom", { all: true });
    return rows.map((item) => ({ ...describeCustomPage(item, slug === ""), item, visible: item.published }));
  } catch (err) {
    console.error("[custom pages]", err instanceof Error ? err.message : err);
    return [];
  }
});

/** Textos y opciones de las páginas: las predeterminadas del sitio principal y las creadas desde el panel. */
const loadPageTexts = cache(async (slug: string): Promise<Record<string, PageText>> => {
  const map: Record<string, PageText> = {};
  for (const def of ALL_PAGE_DEFS) {
    map[def.key] = {
      key: def.key,
      navLabel: def.navLabel,
      title: def.title,
      intro: def.intro,
      imageUrl: def.image ?? "",
      visible: true,
      icon: def.icon,
      group: def.group,
      options: {},
    };
  }
  if (!isDatabaseConfigured()) return map;
  if (slug === "") {
    try {
      await ensureSeeded();
      const rows = await db.select().from(pages);
      for (const r of rows) {
        const base = map[r.key];
        const def = ALL_PAGE_DEFS.find((d) => d.key === r.key);
        if (!base || !def) continue;
        // Las páginas principales (Servicios, Tienda…) y la lista de páginas nuevas no cambian de sección
        const movable = !def.hub && def.key !== "custom";
        map[r.key] = {
          key: r.key,
          navLabel: r.navLabel || base.navLabel,
          title: r.title || base.title,
          intro: r.intro,
          imageUrl: r.imageUrl,
          visible: r.visible,
          icon: isIconName(r.icon) ? r.icon : base.icon,
          group: movable && isGroupKey(r.menuGroup) ? r.menuGroup : base.group,
          options: cleanPageOptions(r.options),
        };
      }
    } catch (err) {
      console.error("[pages]", err instanceof Error ? err.message : err);
    }
  }
  for (const c of await loadCustomSections(slug)) {
    const name = c.item.title || c.item.slug;
    map[c.key] = {
      key: c.key,
      navLabel: name,
      title: name,
      intro: c.item.subtitle,
      imageUrl: c.item.imageUrl,
      visible: c.visible,
      icon: c.icon,
      group: c.group,
      options: cleanPageOptions(c.item.options),
    };
  }
  return map;
});

/** Orden y nombres del menú del sitio principal. */
const loadMenuConfig = cache(async (): Promise<MenuConfig> => {
  if (!isDatabaseConfigured()) return {};
  try {
    await ensureSeeded();
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.site, ""), eq(settings.key, "__menu")))
      .limit(1);
    return row ? cleanMenuConfig(JSON.parse(row.value)) : {};
  } catch {
    return {};
  }
});

/** Menú del sitio con sus secciones y páginas en el orden elegido. */
const loadMenuModel = cache(async (slug: string): Promise<MenuModel> => {
  const [texts, customs, config] = await Promise.all([
    loadPageTexts(slug),
    loadCustomSections(slug),
    loadMenuConfig(),
  ]);
  return buildMenuModel(texts, customs, config, slug === "");
});

/** Elementos de una sección del sitio. */
const loadItems = cache(
  async (slug: string, section: string, opts: { all?: boolean; limit?: number } = {}): Promise<Item[]> => {
    if (!isDatabaseConfigured()) return [];
    await ensureSeeded();
    const conds = [eq(items.site, slug), eq(items.section, section)];
    if (!opts.all) conds.push(eq(items.published, true));
    const q = db
      .select()
      .from(items)
      .where(and(...conds))
      .orderBy(asc(items.sortOrder), desc(items.createdAt))
      .$dynamic();
    return opts.limit ? q.limit(opts.limit) : q;
  },
);

/** Destacados al azar entre las secciones indicadas. */
const loadFeatured = cache(async (slug: string, limit: number, sections: string[]): Promise<Item[]> => {
  if (!isDatabaseConfigured() || sections.length === 0) return [];
  await ensureSeeded();
  return db
    .select()
    .from(items)
    .where(
      and(
        eq(items.site, slug),
        eq(items.featured, true),
        eq(items.published, true),
        ne(items.section, "custom"),
        inArray(items.section, sections),
      ),
    )
    .orderBy(sql`random()`)
    .limit(limit);
});

/** Todo el contenido publicado del sitio (lo usa el buscador). */
const loadAllPublished = cache(async (slug: string): Promise<Item[]> => {
  if (!isDatabaseConfigured()) return [];
  await ensureSeeded();
  return db
    .select()
    .from(items)
    .where(and(eq(items.site, slug), eq(items.published, true)))
    .orderBy(asc(items.sortOrder))
    .limit(3000);
});

/** Nombres de servicios del sitio: alimentan los desplegables de los formularios. */
const loadServiceNames = cache(async (slug: string): Promise<string[]> => {
  if (!isDatabaseConfigured()) return [];
  try {
    const main = await loadItems(slug, "servicios", {});
    const names = main.map((i) => i.title.trim()).filter(Boolean);
    if (names.length > 0) return names;
    // En los subdominios los servicios son páginas propias de tipo “Servicios”
    const customs = await loadCustomSections(slug);
    const out: string[] = [];
    for (const c of customs) {
      if (c.def?.layout !== "services") continue;
      const rows = await loadItems(slug, c.key, {});
      for (const row of rows) if (row.title.trim()) out.push(row.title.trim());
    }
    return out;
  } catch (err) {
    console.error("[servicios]", err instanceof Error ? err.message : err);
    return [];
  }
});

/** Servicios del sitio actual (o del indicado), para los formularios. */
export async function getServiceNames(site?: string): Promise<string[]> {
  return loadServiceNames(site ?? (await currentSlug()));
}

/** Un elemento al azar de una sección (la frase del día, la pregunta del día…). */const loadRandomItem = cache(async (slug: string, section: string): Promise<Item | undefined> => {
  if (!isDatabaseConfigured()) return undefined;
  await ensureSeeded();
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.site, slug), eq(items.section, section), eq(items.published, true)))
    .orderBy(sql`random()`)
    .limit(1);
  return rows[0];
});

/* ════════════════════════════════════════════════════════════════════════════
 * SITIO PÚBLICO — con caché (se refresca al guardar en el panel)
 * ══════════════════════════════════════════════════════════════════════════════ */

const cacheOptions = { revalidate: PAGE_REVALIDATE, tags: [TAG_CONTENT] };

export const cachedSettings = unstable_cache(loadSettings, ["ajustes"], cacheOptions);
export const cachedCustomSections = unstable_cache(loadCustomSections, ["paginas-nuevas"], cacheOptions);
export const cachedPageTexts = unstable_cache(loadPageTexts, ["textos"], cacheOptions);
export const cachedMenuModel = unstable_cache(loadMenuModel, ["menu"], cacheOptions);
export const cachedItems = unstable_cache(loadItems, ["elementos"], cacheOptions);
export const cachedFeatured = unstable_cache(loadFeatured, ["destacados"], { ...cacheOptions, revalidate: 60 });
export const cachedRandomItem = unstable_cache(loadRandomItem, ["al-azar"], { ...cacheOptions, revalidate: 60 });
export const cachedAllPublished = unstable_cache(loadAllPublished, ["todo-publicado"], {
  ...cacheOptions,
  revalidate: 120,
});

/* ════════════════════════════════════════════════════════════════════════════
 * PANEL — sin caché (siempre los datos recién guardados), para el sitio que se está editando
 * ══════════════════════════════════════════════════════════════════════════════ */

async function currentSlug(): Promise<string> {
  return (await getCurrentSite()).slug;
}

export const getSettings = cache(async (): Promise<Settings> => loadSettings(await currentSlug()));

export const getCustomSections = cache(async (): Promise<CustomSection[]> => loadCustomSections(await currentSlug()));

export const getPageTexts = cache(async (): Promise<Record<string, PageText>> => loadPageTexts(await currentSlug()));

export const getMenuConfig = loadMenuConfig;

export const getMenuModel = cache(async (): Promise<MenuModel> => loadMenuModel(await currentSlug()));

/** Elementos de una sección del sitio actual (o del sitio indicado). */
export async function getItems(
  section: string,
  opts: { all?: boolean; limit?: number; site?: string } = {},
): Promise<Item[]> {
  const slug = opts.site ?? (await currentSlug());
  return loadItems(slug, section, opts);
}

/** Un elemento por su número (del sitio indicado, o del sitio actual). */
export async function getItem(id: number, site?: string): Promise<Item | undefined> {
  if (!Number.isInteger(id) || id <= 0 || !isDatabaseConfigured()) return undefined;
  await ensureSeeded();
  const slug = site ?? (await currentSlug());
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.site, slug)))
    .limit(1);
  return rows[0];
}

/** Destacados al azar del sitio actual (panel y vistas previas). */
export async function getFeatured(limit = 8, sections?: string[]): Promise<Item[]> {
  return loadFeatured(await currentSlug(), limit, sections ?? []);
}

export async function getRandomItem(section: string): Promise<Item | undefined> {
  return loadRandomItem(await currentSlug(), section);
}

export type CustomResolved =
  | { kind: "custom-page"; custom: CustomSection; canonical: string }
  | { kind: "section"; section: SectionDef; custom: CustomSection; canonical: string }
  | { kind: "detail"; section: SectionDef; custom: CustomSection; id: number; canonical: string };

/** Busca una dirección entre las páginas creadas desde el panel (sin importar mayúsculas ni acentos). */
export function resolveCustomPath(rawPath: string, customs: CustomSection[]): CustomResolved | null {
  const norm = normalizePath(rawPath);
  const exact = customs.find((c) => normalizePath(c.path) === norm);
  if (exact) {
    return exact.def
      ? { kind: "section", section: exact.def, custom: exact, canonical: exact.path }
      : { kind: "custom-page", custom: exact, canonical: exact.path };
  }
  const m = norm.match(/^(.*)\/(\d+)(?:-[^/]*)?$/);
  if (m) {
    const base = customs.find((c) => normalizePath(c.path) === (m[1] || "/"));
    if (base?.def?.detail) {
      return { kind: "detail", section: base.def, custom: base, id: Number(m[2]), canonical: base.path };
    }
  }
  return null;
}

/**
 * Sección del sitio actual por su clave: una fija del sitio principal o la lista de una
 * página personalizada ("c12"). Los subdominios solo tienen páginas personalizadas.
 */
export async function getAnySection(key: string): Promise<{ section: SectionDef; custom?: CustomSection } | null> {
  const site = await getCurrentSite();
  const fixed = getSection(key);
  if (fixed) return site.isMain || key === "custom" ? { section: fixed } : null;
  if (!/^c\d+$/.test(key)) return null;
  const custom = (await getCustomSections()).find((c) => c.key === key);
  return custom?.def ? { section: custom.def, custom } : null;
}

export async function getSectionCounts(): Promise<Record<string, number>> {
  if (!isDatabaseConfigured()) return {};
  await ensureSeeded();
  const site = await currentSlug();
  const rows = await db
    .select({ section: items.section, count: sql<number>`count(*)::int` })
    .from(items)
    .where(eq(items.site, site))
    .groupBy(items.section);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.section] = Number(r.count);
  return out;
}
