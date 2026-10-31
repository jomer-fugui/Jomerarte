import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { ItemLink } from "@/lib/links";
import type { MlInfo } from "@/lib/ml-ref";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Subdominios: cada uno es un sitio independiente (juegos.jomerarte.com → slug "juegos"). */
export const sites = pgTable("sites", {
  slug: varchar("slug", { length: 63 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Contenido genérico de todas las secciones (servicios, productos, frases, personajes, etc.) */
export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    /** "" = sitio principal; si no, el subdominio al que pertenece */
    site: varchar("site", { length: 63 }).notNull().default(""),
    section: varchar("section", { length: 64 }).notNull(),
    /** Primera categoría (compatibilidad); la lista completa está en `categories` */
    category: varchar("category", { length: 160 }).notNull().default(""),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    slug: varchar("slug", { length: 160 }).notNull().default(""),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    content: text("content").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
    videoUrl: text("video_url").notNull().default(""),
    linkUrl: text("link_url").notNull().default(""),
    linkLabel: text("link_label").notNull().default(""),
    /** Botones con nombre personalizado (ej: “Descargar por Mediafire”) */
    links: jsonb("links").$type<ItemLink[]>().notNull().default([]),
    platform: varchar("platform", { length: 40 }).notNull().default(""),
    price: text("price").notNull().default(""),
    unit: text("unit").notNull().default(""),
    rating: integer("rating").notNull().default(0),
    location: text("location").notNull().default(""),
    /** Mercado Libre: código del producto, tipo (item = publicación · product = página de producto), si el precio se actualiza solo y el último resultado */
    mlId: varchar("ml_id", { length: 40 }).notNull().default(""),
    mlType: varchar("ml_type", { length: 10 }).notNull().default(""),
    mlSync: boolean("ml_sync").notNull().default(false),
    mlInfo: jsonb("ml_info").$type<MlInfo>().notNull().default({}),
    /** Solo páginas personalizadas: tipo de página, ubicación en el menú e ícono */
    pageType: varchar("page_type", { length: 32 }).notNull().default(""),
    menuGroup: varchar("menu_group", { length: 60 }).notNull().default(""),
    icon: varchar("icon", { length: 32 }).notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_site_section_idx").on(t.site, t.section, t.sortOrder)],
);

/** Textos editables de las páginas fijas del sitio principal (título, introducción, imagen, visibilidad) */
export const pages = pgTable("pages", {
  key: varchar("key", { length: 64 }).primaryKey(),
  navLabel: text("nav_label").notNull().default(""),
  title: text("title").notNull().default(""),
  intro: text("intro").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  visible: boolean("visible").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Ajustes de cada sitio (clave / valor). site "" = sitio principal y ajustes internos. */
export const settings = pgTable(
  "settings",
  {
    site: varchar("site", { length: 63 }).notNull().default(""),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull().default(""),
  },
  (t) => [primaryKey({ name: "settings_site_key_pk", columns: [t.site, t.key] })],
);

/**
 * Archivos subidos (fotos, videos, audios, PDF). Se comparten entre todos los sitios.
 *  - Con Vercel Blob: se guarda solo la dirección pública en `url`.
 *  - Sin Blob: el archivo se guarda dentro de la base en `data`.
 */
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull().default(""),
  data: bytea("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
