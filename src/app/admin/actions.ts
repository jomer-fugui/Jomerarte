"use server";

import { revalidatePath } from "next/cache";
import { refreshSite, refreshSites } from "@/lib/revalidate";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { items, media, pages, settings } from "@/db/schema";
import {
  checkPassword,
  createSession,
  destroySession,
  hasPassword,
  passwordFromEnv,
  requireAdmin,
  setPassword,
} from "@/lib/auth";
import { getAnySection } from "@/lib/data";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { RESERVED_SUBDOMAINS, normalizeSubdomain } from "@/lib/hosts";
import { detectPlatform } from "@/lib/platforms";
import {
  cleanSlug,
  customKey,
  customPagePath,
  getPageDef,
  getPageType,
  isGroupKey,
  isIconName,
  normalizePath,
  resolvePath,
  slugFromTitle,
} from "@/lib/sections";
import { SITE_COOKIE, getCurrentSite, getSiteSlugs, type SiteContext } from "@/lib/site";
import { createSite, deleteSite } from "@/lib/sites";
import { isBlobUrl } from "@/lib/storage";
import { cleanLinks, type ItemLink } from "@/lib/links";
import { notifyItemChange, notifySearchEngines } from "@/lib/indexnow";
import { isMlShortLink, isMlUrl, parseMlRef, type MlRef } from "@/lib/ml-ref";
import { resolveShortLink, syncMlPrices } from "@/lib/mercadolibre";

export type FormState = { error?: string } | null;

const SITE_MISMATCH =
  "Cambiaste de sitio en otra pestaña. Recarga esta página antes de guardar, así no se guarda en el sitio equivocado.";

const SITE_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

function str(fd: FormData, key: string, max = 20000): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function refresh() {
  refreshSite();
}

function parseGallery(fd: FormData): string[] {
  try {
    const g: unknown = JSON.parse(str(fd, "gallery", 200000) || "[]");
    if (!Array.isArray(g)) return [];
    return g
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .map((x) => x.trim())
      .slice(0, 100);
  } catch {
    return [];
  }
}

/** Lista de categorías enviada por el formulario (sin repetidas, máximo 20). null si el formulario no la envía. */
function parseCategories(fd: FormData): string[] | null {
  const raw = fd.get("categories");
  if (typeof raw !== "string") return null;
  let list: unknown;
  try {
    list = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const x of list) {
    if (typeof x !== "string") continue;
    const c = x.replace(/\s+/g, " ").trim().slice(0, 60);
    if (c && !out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
    if (out.length >= 20) break;
  }
  return out;
}

/** Botones con nombre personalizado enviados por el formulario. */
function parseLinks(fd: FormData): ItemLink[] {
  try {
    return cleanLinks(JSON.parse(str(fd, "links", 100000) || "[]"));
  } catch {
    return [];
  }
}

/** Sitio que se está editando. Si el formulario se abrió en otro sitio (otra pestaña), devuelve null. */
async function siteFor(fd: FormData): Promise<SiteContext | null> {
  const site = await getCurrentSite();
  const sent = fd.get("__site");
  return typeof sent === "string" && sent !== site.slug ? null : site;
}

function safeRedirectPath(to: string, fallback: string): string {
  return to.startsWith("/") && !to.startsWith("//") ? to : fallback;
}

/* ───────────── Acceso */
export async function loginAction(formData: FormData) {
  if (!(await hasPassword())) redirect("/admin/login");
  const pw = str(formData, "password", 200);
  if (!pw || !(await checkPassword(pw))) {
    await new Promise((r) => setTimeout(r, 600));
    redirect("/admin/login?error=1");
  }
  await createSession();
  redirect("/admin");
}

export async function setupAction(formData: FormData) {
  if (await hasPassword()) redirect("/admin/login");
  const pw = str(formData, "password", 200);
  const confirm = str(formData, "confirm", 200);
  if (pw.length < 6) redirect("/admin/login?error=short");
  if (pw !== confirm) redirect("/admin/login?error=match");
  await setPassword(pw);
  await createSession();
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  (await cookies()).delete(SITE_COOKIE);
  redirect("/admin/login");
}

export async function changePasswordAction(formData: FormData) {
  await requireAdmin();
  if (passwordFromEnv()) redirect("/admin/ajustes?pw=env#seguridad");
  const current = str(formData, "current", 200);
  const next = str(formData, "next", 200);
  const confirm = str(formData, "confirm", 200);
  if (!(await checkPassword(current))) redirect("/admin/ajustes?pw=wrong#seguridad");
  if (next.length < 6) redirect("/admin/ajustes?pw=short#seguridad");
  if (next !== confirm) redirect("/admin/ajustes?pw=match#seguridad");
  await setPassword(next);
  await createSession();
  redirect("/admin/ajustes?pw=ok#seguridad");
}

/* ───────────── Sitios y subdominios */
export async function switchSiteAction(formData: FormData) {
  await requireAdmin();
  const slug = str(formData, "site", 63);
  const jar = await cookies();
  if (slug && (await getSiteSlugs()).includes(slug)) jar.set(SITE_COOKIE, slug, SITE_COOKIE_OPTIONS);
  else jar.delete(SITE_COOKIE);
  refresh();
  redirect(safeRedirectPath(str(formData, "redirectTo", 300), "/admin"));
}

export async function createSiteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const slug = normalizeSubdomain(str(formData, "slug", 80));
  if (slug.length < 2) return { error: "Escribe el nombre del subdominio (mínimo 2 letras), por ejemplo: juegos." };
  if (RESERVED_SUBDOMAINS.has(slug)) return { error: `“${slug}” está reservado. Elige otro nombre.` };
  if ((await getSiteSlugs()).includes(slug)) return { error: `Ya existe el subdominio “${slug}”.` };
  const name = str(formData, "name", 120) || slug.charAt(0).toUpperCase() + slug.slice(1);
  try {
    await db.transaction((tx) =>
      createSite(tx, {
        slug,
        name,
        template: str(formData, "template", 32),
        copyContent: formData.get("copy") === "on",
      }),
    );
  } catch (err) {
    console.error("[sites] crear:", err instanceof Error ? err.message : err);
    return { error: "No se pudo crear el sitio. Intenta de nuevo con otro nombre." };
  }
  // Queda seleccionado para editarlo enseguida
  (await cookies()).set(SITE_COOKIE, slug, SITE_COOKIE_OPTIONS);
  refreshSites();
  redirect("/admin?ok=site");
}

export async function deleteSiteAction(formData: FormData) {
  await requireAdmin();
  const slug = str(formData, "site", 63);
  if (slug && (await getSiteSlugs()).includes(slug)) {
    await deleteSite(slug);
    const jar = await cookies();
    if (jar.get(SITE_COOKIE)?.value === slug) jar.delete(SITE_COOKIE);
  }
  refreshSites();
  redirect("/admin/sitios?ok=deleted");
}

/* ───────────── Contenido de las secciones (fijas o de páginas nuevas) */
export async function saveItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const site = await siteFor(formData);
  if (!site) return { error: SITE_MISMATCH };
  const key = str(formData, "section", 64);
  if (key === "custom") return { error: "Las páginas se crean y editan desde “Páginas personalizadas”." };
  const found = await getAnySection(key);
  if (!found) return { error: "Sección inválida." };
  const section = found.section;
  const id = Number(str(formData, "id", 20)) || 0;

  const linkUrl = str(formData, "linkUrl", 2000);
  let platform = str(formData, "platform", 40);
  if (!platform && linkUrl && section.fields.platform) platform = detectPlatform(linkUrl);

  const single = str(formData, "category", 160);
  const categories = parseCategories(formData) ?? (single ? [single] : []);
  const values = {
    title: str(formData, "title", 500),
    subtitle: str(formData, "subtitle", 1000),
    content: str(formData, "content", 100000),
    category: (categories[0] ?? "").slice(0, 160),
    categories,
    links: parseLinks(formData),
    imageUrl: str(formData, "imageUrl", 2000),
    gallery: parseGallery(formData),
    videoUrl: str(formData, "videoUrl", 2000),
    linkUrl,
    linkLabel: str(formData, "linkLabel", 200),
    platform,
    price: str(formData, "price", 200),
    unit: str(formData, "unit", 200),
    rating: Math.max(0, Math.min(5, Number(str(formData, "rating", 2)) || 0)),
    location: str(formData, "location", 500),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  if (!values.title && !values.content) return { error: "Escribe al menos un título o un contenido." };

  // Precio automático de Mercado Libre (el link de afiliado nunca se modifica)
  let ml: { mlId: string; mlType: string; mlSync: boolean } | null = null;
  if (formData.has("__ml")) {
    const typed = str(formData, "mlRef", 500);
    let ref: MlRef | null = parseMlRef(typed);
    const hiddenId = str(formData, "mlId", 40).toUpperCase();
    const hiddenType = str(formData, "mlType", 10);
    if (!ref && /^M[A-Z]{2}\d{5,13}$/.test(hiddenId) && (hiddenType === "item" || hiddenType === "product")) {
      ref = { id: hiddenId, type: hiddenType };
    }
    if (!ref && isMlUrl(linkUrl)) ref = parseMlRef(linkUrl);
    const wantsSync = formData.get("mlSync") === "on";
    if (!ref && wantsSync) {
      const short = [typed, linkUrl].find((u) => isMlShortLink(u));
      if (short) ref = await resolveShortLink(short, 5000).catch(() => null);
    }
    ml = { mlId: ref?.id ?? "", mlType: ref?.type ?? "", mlSync: Boolean(ref) && wantsSync };
  }

  let savedId = id;
  if (id) {
    const [before] = await db.select({ mlId: items.mlId }).from(items).where(eq(items.id, id)).limit(1);
    await db
      .update(items)
      .set({ ...values, ...(ml ?? {}), ...(ml && before && before.mlId !== ml.mlId ? { mlInfo: {} } : {}) })
      .where(and(eq(items.id, id), eq(items.site, site.slug), eq(items.section, section.key)));
  } else {
    const [first] = await db
      .select({ sortOrder: items.sortOrder })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.section, section.key)))
      .orderBy(asc(items.sortOrder))
      .limit(1);
    const [row] = await db
      .insert(items)
      .values({ ...values, ...(ml ?? {}), site: site.slug, section: section.key, sortOrder: (first?.sortOrder ?? 1) - 1 })
      .returning({ id: items.id });
    savedId = row.id;
  }
  // Trae el precio actual enseguida (si la cuenta está conectada). Si tarda, se actualiza en la próxima ejecución.
  if (ml?.mlSync) {
    await Promise.race([
      syncMlPrices({ ids: [savedId], trigger: "save", budgetMs: 8000 }),
      new Promise((resolve) => setTimeout(resolve, 9000)),
    ]).catch(() => null);
  }
  await notifyItemChange({ id: savedId, site: site.slug, section: section.key, title: values.title });
  refresh();
  redirect(`/admin/s/${section.key}?ok=${id ? "updated" : "created"}`);
}

/* ───────────── Páginas personalizadas (tipo + ubicación en el menú) */
const RESERVED_PATHS = new Set(["admin", "api", "_next", "images", "buscar", "favicon.ico", "icon.svg", "robots.txt", "sitemap.xml"]);

export async function saveCustomPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const site = await siteFor(formData);
  if (!site) return { error: SITE_MISMATCH };
  const id = Number(str(formData, "id", 20)) || 0;
  const title = str(formData, "title", 300);
  if (!title) return { error: "Escribe el nombre de la página." };

  const pageType = getPageType(str(formData, "pageType", 32)).key;
  const rawGroup = str(formData, "menuGroup", 40);
  // Sitio principal: una sección fija del menú · Subdominio: un nombre libre ("" = enlace directo)
  const menuGroup = site.isMain ? (isGroupKey(rawGroup) ? rawGroup : "mas") : rawGroup.replace(/\s+/g, " ").trim();
  const slug = cleanSlug(str(formData, "slug", 120)) || slugFromTitle(title);
  if (!slug || !/[A-Za-z]/.test(slug)) {
    return { error: "La dirección debe tener al menos una letra (por ejemplo: Emprendedores)." };
  }

  const pathOf = (group: string, s: string) => (site.isMain ? customPagePath(group || "mas", s) : `/${s}`);
  const path = pathOf(menuGroup, slug);
  const topLevel = path === `/${slug}`;
  if ((site.isMain && resolvePath(path)) || (topLevel && RESERVED_PATHS.has(slug.toLowerCase()))) {
    return { error: `La dirección “${path}” ya la usa otra sección del sitio. Elige otro nombre o dirección.` };
  }
  const others = await db
    .select({ id: items.id, slug: items.slug, menuGroup: items.menuGroup })
    .from(items)
    .where(and(eq(items.site, site.slug), eq(items.section, "custom")));
  if (others.some((o) => o.id !== id && normalizePath(pathOf(o.menuGroup, o.slug)) === normalizePath(path))) {
    return { error: `Ya existe otra página con la dirección “${path}”.` };
  }

  const iconRaw = str(formData, "icon", 32);
  const values = {
    title,
    slug,
    pageType,
    menuGroup,
    icon: isIconName(iconRaw) ? iconRaw : "",
    subtitle: str(formData, "subtitle", 2000),
    content: str(formData, "content", 100000),
    imageUrl: str(formData, "imageUrl", 2000),
    gallery: parseGallery(formData),
    videoUrl: str(formData, "videoUrl", 2000),
    linkUrl: str(formData, "linkUrl", 2000),
    linkLabel: str(formData, "linkLabel", 200),
    links: parseLinks(formData),
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  let savedId = id;
  if (id) {
    const res = await db
      .update(items)
      .set(values)
      .where(and(eq(items.id, id), eq(items.site, site.slug), eq(items.section, "custom")))
      .returning({ id: items.id });
    if (res.length === 0) return { error: "Esta página ya no existe." };
  } else {
    // Las páginas nuevas se agregan al final del menú
    const [last] = await db
      .select({ sortOrder: items.sortOrder })
      .from(items)
      .where(and(eq(items.site, site.slug), eq(items.section, "custom")))
      .orderBy(desc(items.sortOrder))
      .limit(1);
    const [row] = await db
      .insert(items)
      .values({ ...values, site: site.slug, section: "custom", sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning({ id: items.id });
    savedId = row.id;
  }
  notifySearchEngines(site.slug, [path, "/"]);
  refresh();
  if (pageType === "page") redirect(`/admin/s/custom?ok=${id ? "updated" : "created"}`);
  redirect(`/admin/s/${customKey(savedId)}?ok=${id ? "pageUpdated" : "pageCreated"}`);
}

export async function deleteItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 20));
  if (id) {
    const [row] = await db.select({ section: items.section }).from(items).where(eq(items.id, id)).limit(1);
    // Si es una página personalizada, también se borra todo su contenido
    if (row?.section === "custom") await db.delete(items).where(eq(items.section, customKey(id)));
    await db.delete(items).where(eq(items.id, id));
  }
  refresh();
  const to = str(formData, "redirectTo", 200);
  if (to.startsWith("/admin")) redirect(to);
}

export async function toggleItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 20));
  const field = str(formData, "field", 20);
  const [row] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (row) {
    if (field === "published") await db.update(items).set({ published: !row.published }).where(eq(items.id, id));
    if (field === "featured") await db.update(items).set({ featured: !row.featured }).where(eq(items.id, id));
    await notifyItemChange(row);
  }
  refresh();
}

export async function moveItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 20));
  const dir = str(formData, "dir", 5);
  // El orden se calcula dentro del mismo sitio y la misma sección del elemento
  const [row] = await db.select({ site: items.site, section: items.section }).from(items).where(eq(items.id, id)).limit(1);
  if (!row) return;
  const list = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.site, row.site), eq(items.section, row.section)))
    .orderBy(asc(items.sortOrder), desc(items.createdAt));
  const idx = list.findIndex((r) => r.id === id);
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (idx >= 0 && target >= 0 && target < list.length) {
    [list[idx], list[target]] = [list[target], list[idx]];
    await db.transaction(async (tx) => {
      for (let i = 0; i < list.length; i++) {
        await tx.update(items).set({ sortOrder: i }).where(eq(items.id, list[i].id));
      }
    });
  }
  refresh();
}

/* ───────────── Textos de las páginas fijas (solo sitio principal) */
export async function savePageAction(formData: FormData) {
  await requireAdmin();
  const site = await getCurrentSite();
  const key = str(formData, "key", 64);
  const def = getPageDef(key);
  if (!site.isMain || !def || key === "custom") redirect("/admin");
  const iconRaw = str(formData, "icon", 32);
  const groupRaw = str(formData, "menuGroup", 32);
  const values = {
    navLabel: str(formData, "navLabel", 200),
    title: str(formData, "title", 500),
    intro: str(formData, "intro", 20000),
    imageUrl: str(formData, "imageUrl", 2000),
    visible: formData.get("visible") === "on",
    icon: isIconName(iconRaw) && iconRaw !== def.icon ? iconRaw : "",
    // Las páginas principales (Servicios, Tienda…) no cambian de sección
    menuGroup: !def.hub && isGroupKey(groupRaw) && groupRaw !== def.group ? groupRaw : "",
    updatedAt: new Date(),
  };
  await db
    .insert(pages)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: pages.key, set: values });
  notifySearchEngines("", [def.path]);
  refresh();
  redirect(`/admin/pagina/${key}?ok=1`);
}

/* ───────────── Ajustes del sitio que se está editando */
export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const site = await siteFor(formData);
  if (!site) redirect("/admin/ajustes?error=site");
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!formData.has(key)) continue;
    const value = str(formData, key, 20000);
    await db
      .insert(settings)
      .values({ site: site.slug, key, value })
      .onConflictDoUpdate({ target: [settings.site, settings.key], set: { value } });
  }
  notifySearchEngines(site.slug, ["/"]);
  refresh();
  redirect("/admin/ajustes?ok=1");
}

/* ───────────── Archivos */
export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 20));
  if (id) {
    const [row] = await db.select({ url: media.url }).from(media).where(eq(media.id, id)).limit(1);
    // Si el archivo está en Vercel Blob, también se borra de ahí
    if (row?.url && isBlobUrl(row.url) && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(row.url);
      } catch (err) {
        console.error("[blob] no se pudo borrar:", err instanceof Error ? err.message : err);
      }
    }
    await db.delete(media).where(eq(media.id, id));
  }
  revalidatePath("/admin/medios");
}
