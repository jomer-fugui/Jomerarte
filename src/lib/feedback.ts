import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback } from "@/db/schema";

export type Feedback = typeof feedback.$inferSelect;

/** Comentarios privados de la página de opiniones, del más nuevo al más viejo. */
export async function listFeedback(site: string, limit = 200): Promise<Feedback[]> {
  return db.select().from(feedback).where(eq(feedback.site, site)).orderBy(desc(feedback.createdAt)).limit(limit);
}

/** Cuántos comentarios nuevos (sin leer) hay: se usa para el aviso del panel. */
export async function countUnreadFeedback(site: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(feedback)
    .where(and(eq(feedback.site, site), eq(feedback.read, false)));
  return Number(row?.n ?? 0);
}
