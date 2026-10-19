import { and, asc, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { items, settings, sites } from "@/db/schema";
import { DEFAULT_SETTINGS, INHERITED_SETTING_KEYS } from "./defaults";
import { getPageDef } from "./sections";
import { getSiteTemplate } from "./site-templates";

type ItemRow = typeof items.$inferSelect;
type NewItem = typeof items.$inferInsert;

function cloneItem(row: ItemRow, site: string, section: string): NewItem {
  const { id, createdAt, updatedAt, ...rest } = row;
  void id;
  void createdAt;
  void updatedAt;
  return { ...rest, site, section };
}

export type NewSiteOptions = { slug: string; name: string; template: string; copyContent: boolean };

/**
 * Crea un subdominio independiente: sus propios ajustes (nombre, portada, colores…)
 * y las páginas de la plantilla elegida. Opcionalmente copia contenido del sitio principal.
 */
export async function createSite(tx: Tx, opts: NewSiteOptions): Promise<void> {
  const tpl = getSiteTemplate(opts.template);
  await tx.insert(sites).values({ slug: opts.slug });

  // Contacto, redes, logo y color se copian del sitio principal (después se editan por separado)
  const mainRows = await tx.select().from(settings).where(eq(settings.site, ""));
  const main = new Map(mainRows.map((r) => [r.key, r.value] as const));
  const values: Record<string, string> = {};
  for (const key of INHERITED_SETTING_KEYS) values[key] = main.get(key) ?? DEFAULT_SETTINGS[key];
  values.siteName = opts.name;
  values.tagline = tpl.tagline;
  values.heroTitle = opts.name;
  values.heroText = tpl.heroText;
  values.heroImage = tpl.heroImage ?? "";
  values.footerText = tpl.tagline ? `${opts.name} · ${tpl.tagline}` : "";
  values.homePage = "";

  let order = 0;
  for (const p of tpl.pages) {
    const source = p.copyFrom ? getPageDef(p.copyFrom) : undefined;
    const [page] = await tx
      .insert(items)
      .values({
        site: opts.slug,
        section: "custom",
        title: p.title,
        slug: p.slug,
        pageType: p.type,
        menuGroup: "",
        subtitle: p.intro ?? source?.intro ?? "",
        published: true,
        sortOrder: order++,
      })
      .returning({ id: items.id });
    if (p.home && !values.homePage) values.homePage = String(page.id);
    if (opts.copyContent && p.copyFrom) {
      const rows = await tx
        .select()
        .from(items)
        .where(and(eq(items.site, ""), eq(items.section, p.copyFrom)))
        .orderBy(asc(items.sortOrder));
      if (rows.length > 0) await tx.insert(items).values(rows.map((r) => cloneItem(r, opts.slug, `c${page.id}`)));
    }
  }

  await tx.insert(settings).values(Object.entries(values).map(([key, value]) => ({ site: opts.slug, key, value })));
}

/** Elimina un subdominio con todas sus páginas, contenido y ajustes. */
export async function deleteSite(slug: string): Promise<void> {
  if (!slug) return;
  await db.transaction(async (tx) => {
    await tx.delete(items).where(eq(items.site, slug));
    await tx.delete(settings).where(eq(settings.site, slug));
    await tx.delete(sites).where(eq(sites.slug, slug));
  });
}

/**
 * Convierte frases.jomerarte.com y cielinfier.jomerarte.com en sitios independientes
 * (una sola vez), copiando el contenido que ya existía en el sitio principal.
 */
export async function ensureLegacySubsites(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(727274112)`);
    const flag = await tx
      .insert(settings)
      .values({ site: "", key: "__subsites_v1", value: new Date().toISOString() })
      .onConflictDoNothing()
      .returning({ key: settings.key });
    if (flag.length === 0) return;
    const existing = new Set((await tx.select({ slug: sites.slug }).from(sites)).map((r) => r.slug));
    if (!existing.has("frases")) {
      await createSite(tx, { slug: "frases", name: "Frases de un Hereje", template: "frases", copyContent: true });
    }
    if (!existing.has("cielinfier")) {
      await createSite(tx, { slug: "cielinfier", name: "CielInfier", template: "anime", copyContent: true });
    }
  });
}
