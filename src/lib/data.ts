import { cache } from "react";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { items, pages, settings } from "@/db/schema";
import { DEFAULT_SETTINGS, subsiteDefaults, type Settings } from "./defaults";
import {
  ALL_PAGE_DEFS,
  describeCustomPage,
  getSection,
  normalizePath,
  type CustomPageInfo,
  type SectionDef,
} from "./sections";
import { ensureSeeded } from "./seed";
import { getCurrentSite } from "./site";

export type Item = typeof items.$inferSelect;

export type PageText = {
  key: string;
  navLabel: string;
  title: string;
  intro: string;
  imageUrl: string;
  visible: boolean;
};

/** Página creada desde el panel, con su tipo, ubicación y dirección ya calculados. */
export type CustomSection = CustomPageInfo & { item: Item; visible: boolean };

async function currentSlug(): Promise<string> {
  return (await getCurrentSite()).slug;
}

/** Ajustes del sitio actual: el principal o el subdominio que se está viendo/editando. */
export const getSettings = cache(async (): Promise<Settings> => {
  const site = await getCurrentSite();
  const out: Settings = site.isMain ? { ...DEFAULT_SETTINGS } : subsiteDefaults(site.slug);
  if (!isDatabaseConfigured()) return out;
  try {
    await ensureSeeded();
    const rows = await db.select().from(settings).where(eq(settings.site, site.slug));
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

/** Páginas personalizadas del sitio actual (publicadas y ocultas), en el orden del panel. */
export const getCustomSections = cache(async (): Promise<CustomSection[]> => {
  if (!isDatabaseConfigured()) return [];
  try {
    const site = await getCurrentSite();
    const rows = await getItems("custom", { all: true, site: site.slug });
    return rows.map((item) => ({ ...describeCustomPage(item, site.isMain), item, visible: item.published }));
  } catch (err) {
    console.error("[custom pages]", err instanceof Error ? err.message : err);
    return [];
  }
});

/** Textos de las páginas: las fijas del sitio principal y las creadas desde el panel. */
export const getPageTexts = cache(async (): Promise<Record<string, PageText>> => {
  const map: Record<string, PageText> = {};
  for (const def of ALL_PAGE_DEFS) {
    map[def.key] = {
      key: def.key,
      navLabel: def.navLabel,
      title: def.title,
      intro: def.intro,
      imageUrl: def.image ?? "",
      visible: true,
    };
  }
  if (!isDatabaseConfigured()) return map;
  const site = await getCurrentSite();
  if (site.isMain) {
    try {
      await ensureSeeded();
      const rows = await db.select().from(pages);
      for (const r of rows) {
        const base = map[r.key];
        if (!base) continue;
        map[r.key] = {
          key: r.key,
          navLabel: r.navLabel || base.navLabel,
          title: r.title || base.title,
          intro: r.intro,
          imageUrl: r.imageUrl,
          visible: r.visible,
        };
      }
    } catch (err) {
      console.error("[pages]", err instanceof Error ? err.message : err);
    }
  }
  for (const c of await getCustomSections()) {
    const name = c.item.title || c.item.slug;
    map[c.key] = {
      key: c.key,
      navLabel: name,
      title: name,
      intro: c.item.subtitle,
      imageUrl: c.item.imageUrl,
      visible: c.visible,
    };
  }
  return map;
});

/** Elementos de una sección del sitio actual (o del sitio indicado). */
export async function getItems(
  section: string,
  opts: { all?: boolean; limit?: number; site?: string } = {},
): Promise<Item[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureSeeded();
  const site = opts.site ?? (await currentSlug());
  const conds = [eq(items.site, site), eq(items.section, section)];
  if (!opts.all) conds.push(eq(items.published, true));
  const q = db
    .select()
    .from(items)
    .where(and(...conds))
    .orderBy(asc(items.sortOrder), desc(items.createdAt))
    .$dynamic();
  return opts.limit ? q.limit(opts.limit) : q;
}

export async function getItem(id: number): Promise<Item | undefined> {
  if (!Number.isInteger(id) || id <= 0 || !isDatabaseConfigured()) return undefined;
  await ensureSeeded();
  const rows = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return rows[0];
}

export async function getFeatured(limit = 8): Promise<Item[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureSeeded();
  const site = await currentSlug();
  return db
    .select()
    .from(items)
    .where(and(eq(items.site, site), eq(items.featured, true), eq(items.published, true)))
    .orderBy(asc(items.sortOrder), desc(items.updatedAt))
    .limit(limit);
}

export async function getRandomItem(section: string): Promise<Item | undefined> {
  if (!isDatabaseConfigured()) return undefined;
  await ensureSeeded();
  const site = await currentSlug();
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.site, site), eq(items.section, section), eq(items.published, true)))
    .orderBy(sql`random()`)
    .limit(1);
  return rows[0];
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
