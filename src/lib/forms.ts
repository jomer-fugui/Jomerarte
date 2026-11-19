import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { formSubmissions } from "@/db/schema";
import type { FormAnswer } from "./form-fields";

/** Consultas de las respuestas de los formularios (solo panel). */

export type Submission = typeof formSubmissions.$inferSelect;

/** Respuestas recibidas del sitio, de la más nueva a la más vieja (opcionalmente de un formulario). */
export async function listSubmissions(site: string, formId?: number, limit = 300): Promise<Submission[]> {
  const where = formId ? and(eq(formSubmissions.site, site), eq(formSubmissions.formId, formId)) : eq(formSubmissions.site, site);
  return db.select().from(formSubmissions).where(where).orderBy(desc(formSubmissions.createdAt)).limit(limit);
}

/** Respuestas sin leer: se usa para el aviso del panel. */
export async function countUnreadSubmissions(site: string, formId?: number): Promise<number> {
  const conds = [eq(formSubmissions.site, site), eq(formSubmissions.read, false)];
  if (formId) conds.push(eq(formSubmissions.formId, formId));
  const [row] = await db
    .select({ n: count() })
    .from(formSubmissions)
    .where(and(...conds));
  return Number(row?.n ?? 0);
}

/** Cuántas respuestas llegaron en los últimos `ms`: freno contra envíos repetidos. */
export async function countRecentSubmissions(formId: number, ms = 60_000): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(formSubmissions)
    .where(and(eq(formSubmissions.formId, formId), gte(formSubmissions.createdAt, new Date(Date.now() - ms))));
  return Number(row?.n ?? 0);
}
