import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

/**
 * Conexión "perezosa" a PostgreSQL: NO se conecta ni falla al importar este archivo,
 * solo cuando se hace la primera consulta. Así `next build` funciona en Vercel
 * aunque la base de datos todavía no esté configurada.
 */

/** Nombres de variable que crean Neon, Supabase, Prisma Postgres, etc. (en orden de preferencia) */
const ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function isLocalHost(host: string): boolean {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
}

export function getDatabaseUrl(): string | null {
  for (const key of ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    // En Vercel no existe una base "local": se ignora una URL a localhost (por ej. un .env subido por error).
    if (process.env.VERCEL) {
      try {
        if (isLocalHost(new URL(value).hostname)) continue;
      } catch {
        // URL no estándar: se usa tal cual
      }
    }
    return value;
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

function poolConfig(raw: string): PoolConfig {
  let connectionString = raw;
  let ssl: PoolConfig["ssl"];
  try {
    const url = new URL(raw);
    const mode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    const explicit = url.searchParams.has("uselibpqcompat") || ["verify-full", "verify-ca", "no-verify"].includes(mode);
    if (mode === "disable") {
      ssl = false;
    } else if (!explicit && (mode !== "" || !isLocalHost(url.hostname))) {
      // Igual que "sslmode=require" de psql: conexión cifrada (Neon, Supabase, Prisma Postgres, Railway…)
      url.searchParams.delete("sslmode");
      connectionString = url.toString();
      ssl = { rejectUnauthorized: false };
    }
  } catch {
    // URL no estándar: se usa tal cual
  }
  const serverless = Boolean(process.env.VERCEL);
  return {
    connectionString,
    ssl,
    max: serverless ? 5 : 10,
    idleTimeoutMillis: serverless ? 5_000 : 30_000,
    connectionTimeoutMillis: 15_000,
  };
}

function createDb(pool: Pool) {
  return drizzle(pool);
}

type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as typeof globalThis & {
  __jomerartePool?: Pool;
  __jomerarteDb?: Database;
};

export function getPool(): Pool {
  if (!globalForDb.__jomerartePool) {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error(
        "Falta configurar la base de datos: agrega la variable DATABASE_URL (en Vercel: Storage → Neon, o Settings → Environment Variables).",
      );
    }
    const pool = new Pool(poolConfig(url));
    pool.on("error", (err) => console.error("[db] error en la conexión:", err.message));
    // En Vercel (Fluid compute) libera las conexiones inactivas antes de suspender la función
    if (process.env.VERCEL) attachDatabasePool(pool);
    globalForDb.__jomerartePool = pool;
  }
  return globalForDb.__jomerartePool;
}

export function getDb(): Database {
  if (!globalForDb.__jomerarteDb) globalForDb.__jomerarteDb = createDb(getPool());
  return globalForDb.__jomerarteDb;
}

/** Cliente Drizzle. Se crea recién al usarlo por primera vez (nunca al importar). */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
