import crypto from "node:crypto";
import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { items, settings } from "@/db/schema";
import { siteBaseUrl } from "./hosts";
import {
  ML_COUNTRIES,
  formatMoney,
  isMlShortLink,
  isMlUrl,
  mlCountry,
  parseMlRef,
  type MlInfo,
  type MlRef,
} from "./ml-ref";
import { ensureSeeded } from "./seed";

/**
 * Conexión con la API de Mercado Libre para mantener actualizados los precios.
 * El link de afiliado de cada producto NUNCA se modifica: solo se actualiza el precio.
 */

/** Dirección de la API (se puede cambiar solo para pruebas). */
const API = (process.env.ML_API_BASE || "https://api.mercadolibre.com").replace(/\/+$/, "");
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const ITEM_ATTRS = "id,price,original_price,currency_id,status,available_quantity,title";

/** Ajustes internos (sitio principal). Nunca se muestran en el sitio público. */
const K = {
  clientId: "__ml_client_id",
  clientSecret: "__ml_client_secret",
  country: "__ml_country",
  access: "__ml_access_token",
  expires: "__ml_access_expires",
  refresh: "__ml_refresh_token",
  user: "__ml_user",
  frequency: "__ml_frequency",
  lastRun: "__ml_last_run",
  error: "__ml_error",
} as const;

type Store = Record<string, string>;
type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}
function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readStore(tx?: Tx): Promise<Store> {
  await ensureSeeded();
  const d = (tx ?? db) as unknown as Tx;
  const rows = await d
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(eq(settings.site, ""), sql`left(${settings.key}, 5) = '__ml_'`));
  const out: Store = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function writeStore(entries: Record<string, string | null>, tx?: Tx): Promise<void> {
  const d = (tx ?? db) as unknown as Tx;
  for (const [key, value] of Object.entries(entries)) {
    if (value === null) {
      await d.delete(settings).where(and(eq(settings.site, ""), eq(settings.key, key)));
    } else {
      await d
        .insert(settings)
        .values({ site: "", key, value })
        .onConflictDoUpdate({ target: [settings.site, settings.key], set: { value } });
    }
  }
}

/** Las variables ML_CLIENT_ID y ML_CLIENT_SECRET (Vercel) tienen prioridad sobre lo guardado en el panel. */
function credentials(s: Store) {
  const envId = process.env.ML_CLIENT_ID?.trim();
  const envSecret = process.env.ML_CLIENT_SECRET?.trim();
  return {
    clientId: envId || s[K.clientId] || "",
    clientSecret: envSecret || s[K.clientSecret] || "",
    fromEnv: Boolean(envId && envSecret),
  };
}

/* ═════════════ Configuración ═════════════ */

export type MlUser = { id?: number; nickname?: string; site_id?: string };

export type MlRunSummary = {
  at: string;
  trigger: "cron" | "manual" | "save";
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  skipped: number;
  message?: string;
};

export type MlConfig = {
  clientId: string;
  hasSecret: boolean;
  secretHint: string;
  credsFromEnv: boolean;
  site: string;
  connected: boolean;
  user: MlUser | null;
  tokenError: string;
  frequency: 1 | 2;
  lastRun: MlRunSummary | null;
  cronSecret: boolean;
};

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getMlConfig(): Promise<MlConfig> {
  const s = await readStore();
  const { clientId, clientSecret, fromEnv } = credentials(s);
  return {
    clientId,
    hasSecret: Boolean(clientSecret),
    secretHint: clientSecret ? `••••${clientSecret.slice(-4)}` : "",
    credsFromEnv: fromEnv,
    site: mlCountry(s[K.country]).site,
    connected: Boolean(s[K.refresh] || (s[K.access] && Number(s[K.expires]) > Date.now())),
    user: parseJson<MlUser>(s[K.user]),
    tokenError: s[K.error] ?? "",
    frequency: s[K.frequency] === "2" ? 2 : 1,
    lastRun: parseJson<MlRunSummary>(s[K.lastRun]),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
  };
}

export async function saveMlCredentials(input: { clientId: string; clientSecret: string; country: string }): Promise<void> {
  const s = await readStore();
  const entries: Record<string, string | null> = { [K.country]: mlCountry(input.country).site };
  if (input.clientId) entries[K.clientId] = input.clientId;
  if (input.clientSecret) entries[K.clientSecret] = input.clientSecret;
  // Si cambia la aplicación, la conexión anterior deja de servir
  if (input.clientId && s[K.clientId] && s[K.clientId] !== input.clientId) {
    Object.assign(entries, { [K.access]: null, [K.refresh]: null, [K.expires]: null, [K.user]: null });
  }
  await writeStore(entries);
}

export async function setMlFrequency(days: 1 | 2): Promise<void> {
  await writeStore({ [K.frequency]: String(days) });
}

export async function disconnectMl(): Promise<void> {
  await writeStore({ [K.access]: null, [K.refresh]: null, [K.expires]: null, [K.user]: null, [K.error]: null });
}

export async function setItemMlSync(id: number, on: boolean): Promise<void> {
  await db.update(items).set({ mlSync: on }).where(and(eq(items.id, id), ne(items.mlId, "")));
}

/* ═════════════ Conexión (OAuth) ═════════════ */

export function requestOrigin(h: Headers): string {
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost").split(",")[0].trim();
  const local = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() || (local ? "http" : "https");
  return `${proto}://${host}`;
}

/** Dirección de regreso que hay que registrar en la aplicación de Mercado Libre. */
export function mlRedirectUri(origin: string): string {
  return `${siteBaseUrl() ?? origin}/api/mercadolibre/callback`;
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function mlAuthorizationUrl(redirectUri: string, state: string, challenge: string): Promise<string | null> {
  const s = await readStore();
  const { clientId, clientSecret } = credentials(s);
  if (!clientId || !clientSecret) return null;
  const country = mlCountry(s[K.country]);
  const url = new URL(`https://auth.${country.domain}/authorization`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

type TokenData = { access_token: string; expires_in?: number; refresh_token?: string; user_id?: number };
type TokenResult = { ok: true; data: TokenData } | { ok: false; status: number; error: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResult> {
  try {
    const res = await fetch(`${API}/oauth/token`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.ok && isObj(data) && typeof data.access_token === "string") {
      return {
        ok: true,
        data: {
          access_token: data.access_token,
          expires_in: num(data.expires_in) ?? undefined,
          refresh_token: text(data.refresh_token) || undefined,
          user_id: num(data.user_id) ?? undefined,
        },
      };
    }
    const msg = isObj(data) ? text(data.error_description) || text(data.message) || text(data.error) : "";
    return { ok: false, status: res.status, error: msg || `HTTP ${res.status}` };
  } catch {
    return { ok: false, status: 0, error: "No se pudo conectar con Mercado Libre." };
  }
}

async function saveTokens(data: TokenData, tx?: Tx): Promise<void> {
  const seconds = Math.max(60, data.expires_in ?? 10_800);
  await writeStore(
    {
      [K.access]: data.access_token,
      [K.expires]: String(Date.now() + seconds * 1000),
      ...(data.refresh_token ? { [K.refresh]: data.refresh_token } : {}),
      [K.error]: null,
    },
    tx,
  );
}

/** Cambia el código que devuelve Mercado Libre por los tokens de acceso y guarda la cuenta conectada. */
export async function connectWithCode(
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<{ ok: true; nickname: string } | { ok: false; error: string }> {
  const s = await readStore();
  const { clientId, clientSecret } = credentials(s);
  if (!clientId || !clientSecret) return { ok: false, error: "Faltan el App ID o la clave secreta." };
  const base = { grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri };
  let r = await tokenRequest(verifier ? { ...base, code_verifier: verifier } : base);
  // Por si la aplicación no tiene PKCE activado
  if (!r.ok && r.status === 400 && verifier) r = await tokenRequest(base);
  if (!r.ok) return { ok: false, error: r.error };
  await saveTokens(r.data);

  let user: MlUser = { id: r.data.user_id };
  try {
    const me = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${r.data.access_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (me.ok) {
      const j: unknown = await me.json();
      if (isObj(j)) user = { id: num(j.id) ?? user.id, nickname: text(j.nickname), site_id: text(j.site_id) };
    }
  } catch {
    // la cuenta queda conectada aunque no se pueda leer el apodo
  }
  const knownSite = ML_COUNTRIES.some((c) => c.site === user.site_id);
  await writeStore({ [K.user]: JSON.stringify(user), [K.error]: null, ...(knownSite ? { [K.country]: user.site_id ?? "" } : {}) });
  return { ok: true, nickname: user.nickname ?? "" };
}

export class MlError extends Error {
  constructor(
    public code: "not_connected" | "auth" | "network",
    message: string,
  ) {
    super(message);
  }
}

const NOT_CONNECTED = "Conecta tu cuenta de Mercado Libre en el panel (Precios de Mercado Libre).";

/**
 * Devuelve un token válido. Si venció, lo renueva con el refresh token (que es de un solo uso)
 * dentro de un bloqueo de la base, para que dos procesos no lo gasten al mismo tiempo.
 */
export async function getAccessToken(force = false): Promise<string> {
  const before = await readStore();
  const valid = (s: Store) => Boolean(s[K.access]) && Number(s[K.expires]) > Date.now() + 120_000;
  if (!force && valid(before)) return before[K.access];
  if (!before[K.refresh]) throw new MlError("not_connected", before[K.error] || NOT_CONNECTED);

  type Outcome = { token: string } | { fail: "auth" | "network" | "not_connected"; message: string };
  const outcome: Outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(727274113)`);
    const s = await readStore(tx);
    if (valid(s) && (!force || s[K.access] !== before[K.access])) return { token: s[K.access] };
    const { clientId, clientSecret } = credentials(s);
    if (!clientId || !clientSecret || !s[K.refresh]) return { fail: "not_connected", message: NOT_CONNECTED };
    const r = await tokenRequest({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: s[K.refresh],
    });
    if (!r.ok) {
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        const message = `La conexión con Mercado Libre venció o fue revocada (${r.error}). Vuelve a conectar tu cuenta.`;
        await writeStore({ [K.error]: message, [K.access]: null, [K.refresh]: null, [K.expires]: null }, tx);
        return { fail: "auth", message };
      }
      return { fail: "network", message: r.error };
    }
    await saveTokens(r.data, tx);
    return { token: r.data.access_token };
  });
  if ("token" in outcome) return outcome.token;
  throw new MlError(outcome.fail, outcome.message);
}

/* ═════════════ Consultas a la API ═════════════ */

type ApiResult = { status: number; data: unknown };

async function apiGet(path: string, token: string): Promise<ApiResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch {
      if (attempt === 0) continue;
      return { status: 0, data: null };
    }
    if (res.status === 429 && attempt === 0) {
      await sleep(1500);
      continue;
    }
    return { status: res.status, data: await res.json().catch(() => null) };
  }
  return { status: 0, data: null };
}

class MlClient {
  constructor(private token: string) {}
  async get(path: string): Promise<ApiResult> {
    let r = await apiGet(path, this.token);
    if (r.status === 401) {
      this.token = await getAccessToken(true);
      r = await apiGet(path, this.token);
    }
    return r;
  }
}

type PriceOk = {
  ok: true;
  amount: number | null;
  original: number | null;
  currency: string;
  status: string;
  available: number | null;
  title?: string;
};
type PriceErr = { ok: false; code: "not_found" | "forbidden" | "network"; error: string };
type PriceResult = PriceOk | PriceErr;

const NOT_FOUND_ITEM: PriceErr = { ok: false, code: "not_found", error: "Mercado Libre no encontró esa publicación." };
const FORBIDDEN_ITEM: PriceErr = {
  ok: false,
  code: "forbidden",
  error:
    "Mercado Libre no permite consultar esta publicación con tu cuenta. Usa el enlace de la página del producto (los que tienen /p/ en la dirección).",
};
const networkError = (status: number): PriceErr => ({
  ok: false,
  code: "network",
  error: `Mercado Libre no respondió (código ${status || "sin conexión"}). Se reintentará en la próxima actualización.`,
});

/** Página de producto de catálogo: precio de la publicación ganadora (o la más barata). */
async function fetchProduct(c: MlClient, id: string): Promise<PriceResult> {
  const r = await c.get(`/products/${id}`);
  if (r.status === 404) return { ok: false, code: "not_found", error: "Mercado Libre no encontró esa página de producto." };
  if (r.status === 401 || r.status === 403) {
    return { ok: false, code: "forbidden", error: "Mercado Libre no permitió consultar este producto. Revisa la conexión de tu cuenta." };
  }
  if (r.status !== 200 || !isObj(r.data)) return networkError(r.status);
  const p = r.data;
  const title = text(p.name);
  const active = text(p.status) !== "inactive";
  const winner = isObj(p.buy_box_winner) ? p.buy_box_winner : null;
  if (winner && num(winner.price) !== null) {
    const available = num(winner.available_quantity);
    return {
      ok: true,
      amount: num(winner.price),
      original: num(winner.original_price),
      currency: text(winner.currency_id) || "ARS",
      status: !active ? "inactive" : available === 0 ? "no_stock" : "active",
      available,
      title,
    };
  }
  // Sin publicación ganadora: la más barata de las que compiten
  const r2 = await c.get(`/products/${id}/items?limit=20`);
  const results = isObj(r2.data) && Array.isArray(r2.data.results) ? r2.data.results.filter(isObj) : [];
  let best: Json | null = null;
  for (const it of results) {
    const price = num(it.price);
    if (price !== null && price > 0 && (best === null || price < (num(best.price) ?? Infinity))) best = it;
  }
  if (best) {
    return {
      ok: true,
      amount: num(best.price),
      original: num(best.original_price),
      currency: text(best.currency_id) || "ARS",
      status: active ? "active" : "inactive",
      available: num(best.available_quantity),
      title,
    };
  }
  return { ok: true, amount: null, original: null, currency: "ARS", status: active ? "no_stock" : "inactive", available: 0, title };
}

function fromItemBody(b: Json): PriceOk {
  const status = text(b.status);
  const available = num(b.available_quantity);
  return {
    ok: true,
    amount: num(b.price),
    original: num(b.original_price),
    currency: text(b.currency_id) || "ARS",
    status:
      status === "active" || status === ""
        ? available === 0
          ? "no_stock"
          : "active"
        : status === "paused" || status === "under_review"
          ? "paused"
          : "closed",
    available,
    title: text(b.title),
  };
}

async function mapLimit<T>(list: T[], limit: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) {
      const x = list[i++];
      await fn(x);
    }
  });
  await Promise.all(workers);
}

/** Publicaciones: hasta 20 por consulta y, si se puede, su precio real de venta (con promociones). */
async function fetchItems(c: MlClient, ids: string[], deadline: number): Promise<Map<string, PriceResult>> {
  const out = new Map<string, PriceResult>();
  const r = await c.get(`/items?ids=${ids.join(",")}&attributes=${ITEM_ATTRS}`);
  if (r.status === 200 && Array.isArray(r.data)) {
    r.data.forEach((entry: unknown, i: number) => {
      const id = ids[i];
      if (!id || !isObj(entry)) return;
      const code = num(entry.code);
      if (code === 200 && isObj(entry.body)) out.set(id, fromItemBody(entry.body));
      else if (code === 404) out.set(id, NOT_FOUND_ITEM);
      else if (code === 401 || code === 403) out.set(id, FORBIDDEN_ITEM);
    });
  }
  for (const id of ids) {
    if (out.has(id) || Date.now() > deadline) continue;
    const one = await c.get(`/items/${id}?attributes=${ITEM_ATTRS}`);
    if (one.status === 200 && isObj(one.data)) out.set(id, fromItemBody(one.data));
    else if (one.status === 404) out.set(id, NOT_FOUND_ITEM);
    else if (one.status === 401 || one.status === 403) out.set(id, FORBIDDEN_ITEM);
    else out.set(id, networkError(one.status));
  }
  const okIds = [...out.entries()].filter(([, v]) => v.ok).map(([id]) => id);
  await mapLimit(okIds, 4, async (id) => {
    const current = out.get(id);
    if (!current?.ok || Date.now() > deadline) return;
    const sp = await c.get(`/items/${id}/sale_price?context=channel_marketplace`);
    if (sp.status === 200 && isObj(sp.data)) {
      const amount = num(sp.data.amount);
      if (amount !== null && amount > 0) {
        out.set(id, {
          ...current,
          amount,
          original: num(sp.data.regular_amount) ?? current.original,
          currency: text(sp.data.currency_id) || current.currency,
        });
      }
    }
  });
  return out;
}

/* ═════════════ Actualización de precios ═════════════ */

/**
 * Actualiza el precio de los productos vinculados (de todos los sitios).
 * Empieza por los que hace más tiempo que no se revisan y se detiene antes del límite de tiempo
 * de Vercel: lo que falte se actualiza en la próxima ejecución.
 */
export async function syncMlPrices(opts: {
  ids?: number[];
  trigger: MlRunSummary["trigger"];
  budgetMs?: number;
}): Promise<MlRunSummary> {
  await ensureSeeded();
  const deadline = Date.now() + (opts.budgetMs ?? 45_000);
  const summary: MlRunSummary = {
    at: new Date().toISOString(),
    trigger: opts.trigger,
    total: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
  };
  const finish = async () => {
    if (opts.trigger !== "save") await writeStore({ [K.lastRun]: JSON.stringify(summary) });
    return summary;
  };

  const conds = [eq(items.mlSync, true), ne(items.mlId, "")];
  if (opts.ids?.length) conds.push(inArray(items.id, opts.ids));
  const rows = await db
    .select({ id: items.id, price: items.price, mlId: items.mlId, mlType: items.mlType, mlInfo: items.mlInfo })
    .from(items)
    .where(and(...conds))
    .orderBy(sql`(${items.mlInfo}->>'checkedAt') asc nulls first`, asc(items.id));
  summary.total = rows.length;
  if (rows.length === 0) {
    summary.message = "No hay productos vinculados con actualización automática.";
    return finish();
  }

  let client: MlClient;
  try {
    client = new MlClient(await getAccessToken());
  } catch (err) {
    summary.skipped = rows.length;
    summary.message = err instanceof Error ? err.message : NOT_CONNECTED;
    return finish();
  }

  const results = new Map<number, PriceResult>();
  try {
    await mapLimit(
      rows.filter((r) => r.mlType === "product"),
      4,
      async (r) => {
        if (Date.now() < deadline) results.set(r.id, await fetchProduct(client, r.mlId));
      },
    );
    const itemRows = rows.filter((r) => r.mlType !== "product");
    const uniqueIds = [...new Set(itemRows.map((r) => r.mlId))];
    const byId = new Map<string, PriceResult>();
    for (let i = 0; i < uniqueIds.length; i += 20) {
      if (Date.now() > deadline) break;
      const part = await fetchItems(client, uniqueIds.slice(i, i + 20), deadline);
      part.forEach((v, k) => byId.set(k, v));
    }
    for (const r of itemRows) {
      const v = byId.get(r.mlId);
      if (v) results.set(r.id, v);
    }
  } catch (err) {
    // Si la conexión se cae a mitad de camino, se guarda lo que se alcanzó a consultar
    summary.message = err instanceof Error ? err.message : "Error al consultar Mercado Libre.";
  }

  const now = new Date();
  const nowIso = now.toISOString();
  for (const r of rows) {
    const res = results.get(r.id);
    if (!res) {
      summary.skipped++;
      continue;
    }
    const prev: MlInfo = r.mlInfo ?? {};
    if (!res.ok) {
      summary.failed++;
      await db.update(items).set({ mlInfo: { ...prev, checkedAt: nowIso, error: res.error } }).where(eq(items.id, r.id));
      continue;
    }
    const info: MlInfo = {
      ...prev,
      currency: res.currency,
      status: res.status,
      available: res.available,
      title: res.title || prev.title,
      checkedAt: nowIso,
      error: undefined,
    };
    if (res.amount !== null && res.amount > 0) {
      if (typeof prev.amount === "number" && prev.amount !== res.amount) {
        info.previous = prev.amount;
        info.changedAt = nowIso;
      }
      info.amount = res.amount;
      info.original = res.original !== null && res.original > res.amount ? res.original : null;
      const price = formatMoney(res.amount, res.currency);
      const changed = price !== r.price;
      await db
        .update(items)
        .set({ price, mlInfo: info, ...(changed ? { updatedAt: now } : {}) })
        .where(eq(items.id, r.id));
      if (changed) summary.updated++;
      else summary.unchanged++;
    } else {
      // Sin vendedores con stock: se conserva el último precio y se avisa “Sin stock”
      await db.update(items).set({ mlInfo: info }).where(eq(items.id, r.id));
      summary.unchanged++;
    }
  }
  return finish();
}

/**
 * ¿Toca actualizar? Vercel gratis ejecuta el cron una vez por día (con hasta ±59 min de diferencia),
 * así que se deja un margen de 3 horas. Sin CRON_SECRET, nunca corre más de una vez cada 20 horas.
 */
export async function mlCronDue(hasSecret: boolean): Promise<{ due: boolean; reason?: string }> {
  const cfg = await getMlConfig();
  if (!cfg.connected) return { due: false, reason: "Mercado Libre no está conectado." };
  const last = cfg.lastRun && cfg.lastRun.trigger !== "save" ? Date.parse(cfg.lastRun.at) : 0;
  const minHours = cfg.frequency * 24 - 3;
  const required = hasSecret ? minHours : Math.max(minHours, 20);
  if (last && Date.now() - last < required * 3_600_000) {
    return { due: false, reason: `Todavía no toca (frecuencia: cada ${cfg.frequency === 1 ? "día" : "2 días"}).` };
  }
  return { due: true };
}

/* ═════════════ Detectar el código del producto ═════════════ */

/** Intenta abrir un link corto de afiliado para encontrar el producto (Mercado Libre a veces lo bloquea). */
export async function resolveShortLink(raw: string, timeoutMs = 6000): Promise<MlRef | null> {
  let current = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const end = Date.now() + timeoutMs;
  for (let hop = 0; hop < 6 && Date.now() < end; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "es-AR,es;q=0.9" },
        signal: AbortSignal.timeout(Math.max(1000, end - Date.now())),
        cache: "no-store",
      });
    } catch {
      return null;
    }
    const location = res.headers.get("location");
    if (location && res.status >= 300 && res.status < 400) {
      const next = new URL(location, current).toString();
      const ref = parseMlRef(next);
      if (ref) return ref;
      current = next;
      continue;
    }
    if (res.status === 200) {
      const html = (await res.text()).slice(0, 400_000);
      const preferred = [
        html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1],
        html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)/i)?.[1],
      ];
      const others = [...html.matchAll(/https?:\/\/[^"'\s<>]+/g)].map((m) => m[0]);
      for (const u of [...preferred, ...others]) {
        if (!u || !isMlUrl(u)) continue;
        const ref = parseMlRef(u);
        if (ref) return ref;
      }
    }
    return null;
  }
  return null;
}

export type MlLookup = {
  ok: boolean;
  message: string;
  connected: boolean;
  ref?: MlRef;
  title?: string;
  amount?: number | null;
  original?: number | null;
  currency?: string;
  status?: string;
  formatted?: string;
};

/** Para el botón “Detectar y traer precio” del panel. */
export async function lookupMl(refInput: string, linkInput: string): Promise<MlLookup> {
  const cfg = await getMlConfig();
  let ref = parseMlRef(refInput);
  const typedCode = Boolean(ref) && !/[/.]/.test(refInput);
  if (!ref && isMlUrl(linkInput)) ref = parseMlRef(linkInput);
  if (!ref) {
    const short = [refInput, linkInput].find((u) => isMlShortLink(u));
    if (short) {
      ref = await resolveShortLink(short);
      if (!ref) {
        return {
          ok: false,
          connected: cfg.connected,
          message:
            "Mercado Libre no deja abrir el link corto de afiliado desde el servidor. Abre tu producto en el navegador y pega aquí ese enlace (o su código, por ejemplo MLA12345678). Tu link de afiliado no cambia.",
        };
      }
    }
  }
  if (!ref) {
    const isUp = /\/up\/M[A-Z]{2}U\d+/i.test(`${refInput} ${linkInput}`);
    return {
      ok: false,
      connected: cfg.connected,
      message: isUp
        ? "Ese enlace (/up/…) no se puede consultar. Abre el producto y copia el enlace de su página de producto (con /p/) o el de la publicación (MLA-…)."
        : "No encontré el código del producto. Pega el enlace normal del producto (el que ves en el navegador) o su código, por ejemplo MLA12345678.",
    };
  }
  if (!cfg.connected) {
    return { ok: true, ref, connected: false, message: "Código detectado. Conecta tu cuenta de Mercado Libre para traer el precio." };
  }

  let client: MlClient;
  try {
    client = new MlClient(await getAccessToken());
  } catch (err) {
    return { ok: true, ref, connected: false, message: err instanceof Error ? err.message : NOT_CONNECTED };
  }
  const fetchRef = async (r: MlRef): Promise<PriceResult> =>
    r.type === "product"
      ? fetchProduct(client, r.id)
      : ((await fetchItems(client, [r.id], Date.now() + 15_000)).get(r.id) ?? NOT_FOUND_ITEM);

  let res = await fetchRef(ref);
  // Un código escrito a mano puede ser de una página de producto o de una publicación: se prueba el otro tipo
  if (!res.ok && res.code === "not_found" && typedCode) {
    const alt: MlRef = { id: ref.id, type: ref.type === "product" ? "item" : "product" };
    const second = await fetchRef(alt);
    if (second.ok) {
      ref = alt;
      res = second;
    }
  }
  if (!res.ok) return { ok: false, ref, connected: true, message: res.error };
  return {
    ok: true,
    ref,
    connected: true,
    title: res.title,
    amount: res.amount,
    original: res.original,
    currency: res.currency,
    status: res.status,
    formatted: res.amount ? formatMoney(res.amount, res.currency) : "",
    message: res.amount ? "Precio encontrado." : "El producto existe, pero ahora no tiene vendedores con stock.",
  };
}

/** Busca el código en los links de los productos de Mercado Libre que todavía no están vinculados. */
export async function detectMissingMlCodes(budgetMs = 40_000): Promise<{ total: number; detected: number; failed: number }> {
  await ensureSeeded();
  const deadline = Date.now() + budgetMs;
  const rows = await db
    .select({ id: items.id, linkUrl: items.linkUrl })
    .from(items)
    .where(
      and(
        eq(items.mlId, ""),
        ne(items.section, "custom"),
        ne(items.linkUrl, ""),
        or(eq(items.platform, "mercadolibre"), ilike(items.linkUrl, "%mercadoli%"), ilike(items.linkUrl, "%meli.la%")),
      ),
    );
  let detected = 0;
  let failed = 0;
  await mapLimit(rows, 3, async (r) => {
    let ref = parseMlRef(r.linkUrl);
    if (!ref && isMlShortLink(r.linkUrl) && Date.now() < deadline) {
      ref = await resolveShortLink(r.linkUrl, Math.min(6000, deadline - Date.now()));
    }
    if (!ref) {
      failed++;
      return;
    }
    await db.update(items).set({ mlId: ref.id, mlType: ref.type, mlSync: true, mlInfo: {} }).where(eq(items.id, r.id));
    detected++;
  });
  return { total: rows.length, detected, failed };
}
