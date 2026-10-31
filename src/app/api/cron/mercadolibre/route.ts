import crypto from "node:crypto";
import { isDatabaseConfigured } from "@/db";
import { mlCronDue, syncMlPrices } from "@/lib/mercadolibre";

export const dynamic = "force-dynamic";
/** Tiempo máximo permitido en el plan gratuito de Vercel (sobra para cientos de productos). */
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Actualización automática de precios de Mercado Libre.
 * Vercel la llama una vez por día (ver vercel.json); si elegiste “cada 2 días”, un día sí y otro no.
 * Con la variable CRON_SECRET, solo Vercel puede llamarla.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return Response.json({ ok: true, skipped: "Falta conectar la base de datos." });

  const due = await mlCronDue(Boolean(secret));
  if (!due.due) return Response.json({ ok: true, skipped: due.reason });

  const summary = await syncMlPrices({ trigger: "cron", budgetMs: 50_000 });
  return Response.json({ ok: true, ...summary });
}
