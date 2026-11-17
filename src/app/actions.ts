"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { getCurrentSite } from "@/lib/site";

export type FeedbackState = { ok?: boolean; error?: string } | null;

/**
 * Freno simple contra envíos repetidos: como mucho un comentario cada 20 segundos y 10 por hora
 * desde la misma conexión. Vive en memoria: alcanza para el uso normal de un negocio chico.
 */
const recent = new Map<string, number[]>();
const MAX_PER_HOUR = 10;
const MIN_GAP_MS = 20_000;

function tooFast(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= MAX_PER_HOUR) return true;
  if (list.length > 0 && now - list[list.length - 1] < MIN_GAP_MS) return true;
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return false;
}

function clean(value: FormDataEntryValue | null, max: number): string {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

/**
 * Guarda el comentario privado que deja un visitante en la página de opiniones.
 * No publica nada: queda solo en el panel, para que el dueño lo lea y pueda responder.
 */
export async function sendFeedbackAction(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  // Trampa para robots: un campo invisible que las personas no completan
  if (clean(formData.get("website"), 100)) return { ok: true };

  const message = clean(formData.get("message"), 2000);
  const name = clean(formData.get("name"), 80);
  const contact = clean(formData.get("contact"), 120);
  const ratingRaw = Number(clean(formData.get("rating"), 2));
  const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(5, Math.round(ratingRaw))) : 0;
  const origin = clean(formData.get("origin"), 160).replace(/[^\w\-/?=&.#%/]/g, "").slice(0, 160);

  if (message.length < 5) {
    return { error: "Escribí un par de palabras sobre cómo te fue (mínimo 5 letras)." };
  }

  const head = await headers();
  const ip = (head.get("x-forwarded-for") ?? head.get("x-real-ip") ?? "local").split(",")[0].trim();
  if (tooFast(ip)) {
    return { error: "Ya recibimos tu comentario. Esperá un momento antes de mandar otro, gracias." };
  }

  const site = await getCurrentSite();
  await db.insert(feedback).values({ site: site.slug, name, contact, rating, message, origin });
  revalidatePath("/admin/opiniones");
  return { ok: true };
}
