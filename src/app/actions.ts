"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, formSubmissions, items } from "@/db/schema";
import { cleanFormConfig, type FormAnswer } from "@/lib/form-fields";
import { countRecentSubmissions } from "@/lib/forms";
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

/* ═════════════ Formularios de las páginas creadas desde el panel ═════════════ */

export type FormSubmitState = { ok?: boolean; error?: string } | null;

const MIN_GAP_FORM_MS = 2_000;
const MAX_PER_MINUTE = 20;
const lastSendByIp = new Map<string, number>();

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Recibe lo que completa un visitante en una página de tipo “Formulario”.
 * Valida contra la definición guardada en el panel (no confía en lo que manda el navegador),
 * frena los robots con un campo trampa y un límite de envíos, y guarda la respuesta.
 */
export async function submitFormAction(_prev: FormSubmitState, formData: FormData): Promise<FormSubmitState> {
  // Trampa para robots
  if (clean(formData.get("website"), 100)) return { ok: true };

  const formId = Number(clean(formData.get("formId"), 20));
  if (!Number.isInteger(formId) || formId <= 0) return { error: "No encontramos este formulario. Recargá la página." };

  const site = await getCurrentSite();
  const [page] = await db
    .select({ form: items.form, title: items.title })
    .from(items)
    .where(and(eq(items.id, formId), eq(items.site, site.slug)))
    .limit(1);
  if (!page) return { error: "Este formulario ya no está disponible." };

  const config = cleanFormConfig(page.form);
  if (config.fields.length === 0) return { error: "Este formulario todavía no tiene campos. Probá más tarde." };

  const answers: FormAnswer[] = [];
  for (const field of config.fields) {
    const name = `f_${field.id}`;
    let value = clean(formData.get(name), field.type === "textarea" ? 3000 : 200).replace(/\s+/g, " ").trim();

    if (field.type === "select" && (value === "__otro" || value === "")) {
      // Eligió “Otro (especificar)”: vale lo que escribió en el campo de al lado
      const other = clean(formData.get(`${name}__otro`), 200).replace(/\s+/g, " ").trim();
      value = other ? `Otro: ${other}` : "";
    }
    if (field.type === "email" && value && !validEmail(value)) {
      return { error: `Revisá el email de “${field.label}”: parece que falta algo.` };
    }
    if (field.required && !value) {
      return { error: `Falta completar “${field.label}”.` };
    }
    if (value) answers.push({ label: field.label, value: value.slice(0, 4000) });
  }

  if (answers.length === 0) return { error: "Completá al menos un dato y volvé a enviar." };

  const head = await headers();
  const ip = (head.get("x-forwarded-for") ?? head.get("x-real-ip") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const last = lastSendByIp.get(ip) ?? 0;
  if (now - last < MIN_GAP_FORM_MS) {
    return { error: "Ya recibimos tu mensaje. Esperá un momento antes de mandar otro, gracias." };
  }
  if (lastSendByIp.size > 5000) lastSendByIp.clear();
  if ((await countRecentSubmissions(formId)) >= MAX_PER_MINUTE) {
    return { error: "Recibimos muchos mensajes seguidos. Probá de nuevo en un minuto." };
  }
  lastSendByIp.set(ip, now);

  const origin = clean(formData.get("origin"), 160).replace(/[^\w\-/?=&.#%/]/g, "").slice(0, 160);

  await db.insert(formSubmissions).values({
    site: site.slug,
    formId,
    formKey: `c${formId}`,
    page: origin,
    answers,
  });
  revalidatePath("/admin/formularios");
  return { ok: true };
}
