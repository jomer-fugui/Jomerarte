"use server";

import { revalidatePath } from "next/cache";
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
import { isBlobUrl } from "@/lib/storage";

export type FormState = { error?: string } | null;

function str(fd: FormData, key: string, max = 20000): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function refresh() {
  revalidatePath("/", "layout");
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

/* ───────────── Contenido de las secciones (fijas o páginas nuevas) */
export async function saveItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const key = str(formData, "section", 64);
  if (key === "custom") return { error: "Las páginas se crean y editan desde “Páginas personalizadas”." };
  const found = await getAnySection(key);
  if (!found) return { error: "Sección inválida." };
  const section = found.section;
  const id = Number(str(formData, "id", 20)) || 0;

  const linkUrl = str(formData, "linkUrl", 2000);
  let platform = str(formData, "platform", 40);
  if (!platform && linkUrl && section.fields.platform) platform = detectPlatform(linkUrl);

  const values = {
    title: str(formData, "title", 500),
    subtitle: str(formData, "subtitle", 1000),
    content: str(formData, "content", 100000),
    category: str(formData, "category", 160),
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

  if (id) {
    await db
      .update(items)
      .set(values)
      .where(and(eq(items.id, id), eq(items.section, section.key)));
  } else {
    const [first] = await db
      .select({ sortOrder: items.sortOrder })
      .from(items)
      .where(eq(items.section, section.key))
      .orderBy(asc(items.sortOrder))
      .limit(1);
    await db.insert(items).values({ ...values, section: section.key, sortOrder: (first?.sortOrder ?? 1) - 1 });
  }
  refresh();
  redirect(`/admin/s/${section.key}?ok=${id ? "updated" : "created"}`);
}

/* ───────────── Páginas personalizadas (tipo + ubicación en el menú) */
const RESERVED = new Set(["admin", "api", "_next", "images", "favicon.ico", "icon.svg", "robots.txt", "sitemap.xml"]);

export async function saveCustomPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(str(formData, "id", 20)) || 0;
  const title = str(formData, "title", 300);
  if (!title) return { error: "Escribe el nombre de la página." };

  const pageType = getPageType(str(formData, "pageType", 32)).key;
  const groupRaw = str(formData, "menuGroup", 32);
  const menuGroup = isGroupKey(groupRaw) ? groupRaw : "mas";
  const slug = cleanSlug(str(formData, "slug", 120)) || slugFromTitle(title);
  if (!slug || !/[A-Za-z]/.test(slug)) {
    return { error: "La dirección debe tener al menos una letra (por ejemplo: Emprendedores)." };
  }

  const path = customPagePath(menuGroup, slug);
  if (resolvePath(path) || (menuGroup === "mas" && RESERVED.has(slug.toLowerCase()))) {
    return { error: `La dirección “${path}” ya la usa otra sección del sitio. Elige otro nombre o dirección.` };
  }
  const others = await db
    .select({ id: items.id, slug: items.slug, menuGroup: items.menuGroup })
    .from(items)
    .where(eq(items.section, "custom"));
  if (others.some((o) => o.id !== id && normalizePath(customPagePath(o.menuGroup || "mas", o.slug)) === normalizePath(path))) {
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
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  let savedId = id;
  if (id) {
    const res = await db
      .update(items)
      .set(values)
      .where(and(eq(items.id, id), eq(items.section, "custom")))
      .returning({ id: items.id });
    if (res.length === 0) return { error: "Esta página ya no existe." };
  } else {
    // Las páginas nuevas se agregan al final del menú de su sección
    const [last] = await db
      .select({ sortOrder: items.sortOrder })
      .from(items)
      .where(eq(items.section, "custom"))
      .orderBy(desc(items.sortOrder))
      .limit(1);
    const [row] = await db
      .insert(items)
      .values({ ...values, section: "custom", sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning({ id: items.id });
    savedId = row.id;
  }
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
  }
  refresh();
}

export async function moveItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 20));
  const dir = str(formData, "dir", 5);
  const section = str(formData, "section", 64);
  const list = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.section, section))
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

/* ───────────── Textos de las páginas fijas */
export async function savePageAction(formData: FormData) {
  await requireAdmin();
  const key = str(formData, "key", 64);
  if (!getPageDef(key)) redirect("/admin");
  const values = {
    navLabel: str(formData, "navLabel", 200),
    title: str(formData, "title", 500),
    intro: str(formData, "intro", 20000),
    imageUrl: str(formData, "imageUrl", 2000),
    visible: formData.get("visible") === "on",
    updatedAt: new Date(),
  };
  await db
    .insert(pages)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: pages.key, set: values });
  refresh();
  redirect(`/admin/s/${key}?ok=page`);
}

/* ───────────── Ajustes */
export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!formData.has(key)) continue;
    const value = str(formData, key, 20000);
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
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
