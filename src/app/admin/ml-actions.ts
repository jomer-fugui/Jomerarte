"use server";

import { revalidatePath } from "next/cache";
import { refreshSite } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  detectMissingMlCodes,
  disconnectMl,
  saveMlCredentials,
  setItemMlSync,
  setMlFrequency,
  syncMlPrices,
} from "@/lib/mercadolibre";

function str(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function saveMlCredentialsAction(formData: FormData) {
  await requireAdmin();
  await saveMlCredentials({
    clientId: str(formData, "clientId", 80).replace(/\s+/g, ""),
    clientSecret: str(formData, "clientSecret", 200).replace(/\s+/g, ""),
    country: str(formData, "country", 3),
  });
  redirect("/admin/mercadolibre?ok=credenciales");
}

export async function saveMlFrequencyAction(formData: FormData) {
  await requireAdmin();
  await setMlFrequency(str(formData, "frequency", 1) === "2" ? 2 : 1);
  redirect("/admin/mercadolibre?ok=frecuencia");
}

export async function disconnectMlAction() {
  await requireAdmin();
  await disconnectMl();
  redirect("/admin/mercadolibre?ok=desconectado");
}

export async function syncMlNowAction() {
  await requireAdmin();
  await syncMlPrices({ trigger: "manual", budgetMs: 50_000 });
  refreshSite();
  redirect("/admin/mercadolibre?ok=sync");
}

export async function detectMlCodesAction() {
  await requireAdmin();
  const r = await detectMissingMlCodes();
  refreshSite();
  redirect(`/admin/mercadolibre?detected=${r.detected}&failed=${r.failed}`);
}

export async function toggleMlItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id", 12));
  if (id) await setItemMlSync(id, str(formData, "on", 1) === "1");
  revalidatePath("/admin/mercadolibre");
}
