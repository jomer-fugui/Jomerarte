import { db, getPool } from "@/db";
import { items, settings } from "@/db/schema";
import { SEED_ITEMS } from "./seed-data";
import { ensureLegacySubsites } from "./sites";

/**
 * Crea / actualiza las tablas automáticamente (no hace falta correr comandos en Vercel).
 * Sube SCHEMA_VERSION cuando cambie la estructura para que se vuelva a aplicar.
 *  v3: páginas personalizadas con tipo, ubicación e ícono + correcciones de textos.
 *  v4: subdominios independientes (tabla "sites" y columna "site" en el contenido y los ajustes).
 *  v5: varias categorías por publicación y botones con nombre personalizado (descargas).
 *  v6: precios automáticos de Mercado Libre (código del producto y último precio consultado).
 *  v7: orden del menú, edición de páginas predeterminadas y orden/estilo de las categorías.
 *  v8: los robots que solo entrenan modelos de IA quedan bloqueados (los asistentes siguen entrando).
 */
const SCHEMA_VERSION = "8";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "sites" (
  "slug" varchar(63) PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "items" (
  "id" serial PRIMARY KEY NOT NULL,
  "site" varchar(63) DEFAULT '' NOT NULL,
  "section" varchar(64) NOT NULL,
  "category" varchar(160) DEFAULT '' NOT NULL,
  "categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "slug" varchar(160) DEFAULT '' NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "subtitle" text DEFAULT '' NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "video_url" text DEFAULT '' NOT NULL,
  "link_url" text DEFAULT '' NOT NULL,
  "link_label" text DEFAULT '' NOT NULL,
  "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "platform" varchar(40) DEFAULT '' NOT NULL,
  "price" text DEFAULT '' NOT NULL,
  "unit" text DEFAULT '' NOT NULL,
  "rating" integer DEFAULT 0 NOT NULL,
  "location" text DEFAULT '' NOT NULL,
  "ml_id" varchar(40) DEFAULT '' NOT NULL,
  "ml_type" varchar(10) DEFAULT '' NOT NULL,
  "ml_sync" boolean DEFAULT false NOT NULL,
  "ml_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "page_type" varchar(32) DEFAULT '' NOT NULL,
  "menu_group" varchar(60) DEFAULT '' NOT NULL,
  "icon" varchar(32) DEFAULT '' NOT NULL,
  "options" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "published" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "page_type" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "menu_group" varchar(60) DEFAULT '' NOT NULL;
ALTER TABLE "items" ALTER COLUMN "menu_group" TYPE varchar(60);
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "icon" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "site" varchar(63) DEFAULT '' NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "links" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "ml_id" varchar(40) DEFAULT '' NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "ml_type" varchar(10) DEFAULT '' NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "ml_sync" boolean DEFAULT false NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "ml_info" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT '{}'::jsonb NOT NULL;
UPDATE "items" SET "categories" = jsonb_build_array("category") WHERE "category" <> '' AND "categories" = '[]'::jsonb;
CREATE INDEX IF NOT EXISTS "items_site_section_idx" ON "items" USING btree ("site","section","sort_order");
DROP INDEX IF EXISTS "items_section_idx";
CREATE TABLE IF NOT EXISTS "pages" (
  "key" varchar(64) PRIMARY KEY NOT NULL,
  "nav_label" text DEFAULT '' NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "intro" text DEFAULT '' NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "visible" boolean DEFAULT true NOT NULL,
  "icon" varchar(32) DEFAULT '' NOT NULL,
  "menu_group" varchar(32) DEFAULT '' NOT NULL,
  "options" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "icon" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "menu_group" varchar(32) DEFAULT '' NOT NULL;
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT '{}'::jsonb NOT NULL;
CREATE TABLE IF NOT EXISTS "settings" (
  "site" varchar(63) DEFAULT '' NOT NULL,
  "key" varchar(100) NOT NULL,
  "value" text DEFAULT '' NOT NULL,
  CONSTRAINT "settings_site_key_pk" PRIMARY KEY("site","key")
);
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "site" varchar(63) DEFAULT '' NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_site_key_pk') THEN
    ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_pkey";
    ALTER TABLE "settings" ADD CONSTRAINT "settings_site_key_pk" PRIMARY KEY ("site", "key");
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "media" (
  "id" serial PRIMARY KEY NOT NULL,
  "filename" text NOT NULL,
  "mime_type" varchar(120) NOT NULL,
  "size" integer NOT NULL,
  "url" text DEFAULT '' NOT NULL,
  "data" bytea,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "url" text DEFAULT '' NOT NULL;
ALTER TABLE "media" ALTER COLUMN "data" DROP NOT NULL;
UPDATE "settings" SET "value" = replace("value", 'Jomer Works', 'Jomer Worrhis') WHERE "value" LIKE '%Jomer Works%';
UPDATE "pages" SET
  "nav_label" = replace(replace("nav_label", 'Herje', 'Hereje'), 'herje', 'hereje'),
  "title" = replace(replace("title", 'Herje', 'Hereje'), 'herje', 'hereje'),
  "intro" = replace(replace("intro", 'Herje', 'Hereje'), 'herje', 'hereje')
  WHERE "nav_label" ILIKE '%herje%' OR "title" ILIKE '%herje%' OR "intro" ILIKE '%herje%';
UPDATE "pages" SET "nav_label" = 'Preguntas' WHERE "key" = 'colmos' AND "nav_label" = 'Colmos';
UPDATE "pages" SET "title" = 'Preguntas' WHERE "key" = 'colmos' AND "title" = 'Colmos';
UPDATE "settings" SET "value" = 'no-training' WHERE "key" = 'aiPolicy' AND "value" = 'all';
`;

async function currentSchemaVersion(): Promise<string | null> {
  try {
    const res = await getPool().query<{ value: string }>(
      `SELECT "value" FROM "settings" WHERE "key" = '__schema_version'`,
    );
    return res.rows[0]?.value ?? null;
  } catch {
    return null; // la tabla todavía no existe
  }
}

async function migrate(): Promise<void> {
  if ((await currentSchemaVersion()) === SCHEMA_VERSION) return;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Evita que dos servidores creen las tablas al mismo tiempo (primer arranque en Vercel)
    await client.query("SELECT pg_advisory_xact_lock(727274111)");
    await client.query(SCHEMA_SQL);
    await client.query(
      `INSERT INTO "settings" ("site", "key", "value") VALUES ('', '__schema_version', $1)
       ON CONFLICT ("site", "key") DO UPDATE SET "value" = EXCLUDED."value"`,
      [SCHEMA_VERSION],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

let seedPromise: Promise<void> | null = null;

/** Se ejecuta una vez por servidor: asegura las tablas y carga el contenido de ejemplo (solo la primera vez). */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = run().catch((err) => {
      console.error("[seed] error:", err instanceof Error ? err.message : err);
      seedPromise = null;
    });
  }
  return seedPromise;
}

async function run(): Promise<void> {
  await migrate();
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(settings)
      .values({ key: "__seeded", value: new Date().toISOString() })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) return;
    const counters: Record<string, number> = {};
    const rows = SEED_ITEMS.map((it) => {
      const n = counters[it.section] ?? 0;
      counters[it.section] = n + 1;
      return { ...it, categories: it.category ? [it.category] : [], sortOrder: n };
    });
    await tx.insert(items).values(rows);
  });
  // frases.jomerarte.com y cielinfier.jomerarte.com pasan a ser sitios independientes
  await ensureLegacySubsites();
}
