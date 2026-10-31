import Link from "next/link";
import { headers } from "next/headers";
import { and, asc, eq, ilike, ne, or } from "drizzle-orm";
import { CircleAlert, CircleCheck, Clock, ExternalLink, Plug, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { db } from "@/db";
import { items } from "@/db/schema";
import { getMlConfig, mlRedirectUri, requestOrigin } from "@/lib/mercadolibre";
import { ML_COUNTRIES, mlCountry, mlPublicUrl, mlStatusLabel, type MlKind } from "@/lib/ml-ref";
import { getCurrentSite, getSitesOverview } from "@/lib/site";
import { ConfirmButton, CopyButton } from "@/components/client";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { switchSiteAction } from "../../actions";
import {
  detectMlCodesAction,
  disconnectMlAction,
  saveMlCredentialsAction,
  saveMlFrequencyAction,
  syncMlNowAction,
  toggleMlItemAction,
} from "../../ml-actions";

export const dynamic = "force-dynamic";
/** “Actualizar ahora” puede tardar si hay muchos productos */
export const maxDuration = 60;

const OK: Record<string, string> = {
  conectado: "¡Listo! Tu cuenta de Mercado Libre quedó conectada.",
  credenciales: "Datos de la aplicación guardados. Ahora pulsa “Conectar con Mercado Libre”.",
  frecuencia: "Frecuencia guardada.",
  sync: "Actualización terminada. Mira el resultado abajo.",
  desconectado: "Cuenta desconectada. Los precios dejarán de actualizarse hasta que vuelvas a conectarla.",
};

const ERR: Record<string, string> = {
  credenciales: "Primero guarda el App ID y la clave secreta de tu aplicación.",
  estado: "No se pudo verificar la conexión (pasaron más de 10 minutos o se abrió en otra pestaña). Intenta de nuevo.",
  access_denied: "Cancelaste la autorización en Mercado Libre.",
};

const TRIGGER: Record<string, string> = { cron: "automática", manual: "manual", save: "al guardar" };

function when(iso: string | undefined, tz: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(d);
}

export default async function MercadoLibrePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; detected?: string; failed?: string }>;
}) {
  const [cfg, sp, h, site, sites] = await Promise.all([
    getMlConfig(),
    searchParams,
    headers(),
    getCurrentSite(),
    getSitesOverview(),
  ]);
  const country = mlCountry(cfg.site);
  const redirectUri = mlRedirectUri(requestOrigin(h));
  const siteName = new Map(sites.map((s) => [s.slug, s.name] as const));
  const canSwitch = site.via !== "host";

  const linked = await db
    .select({
      id: items.id,
      site: items.site,
      section: items.section,
      title: items.title,
      price: items.price,
      mlId: items.mlId,
      mlType: items.mlType,
      mlSync: items.mlSync,
      mlInfo: items.mlInfo,
    })
    .from(items)
    .where(ne(items.mlId, ""))
    .orderBy(asc(items.site), asc(items.section), asc(items.sortOrder))
    .limit(500);
  const pending = await db
    .select({ id: items.id, site: items.site, section: items.section, title: items.title, linkUrl: items.linkUrl })
    .from(items)
    .where(
      and(
        eq(items.mlId, ""),
        ne(items.section, "custom"),
        ne(items.linkUrl, ""),
        or(eq(items.platform, "mercadolibre"), ilike(items.linkUrl, "%mercadoli%"), ilike(items.linkUrl, "%meli.la%")),
      ),
    )
    .orderBy(asc(items.site), asc(items.section))
    .limit(200);

  const errorText = sp.error ? (ERR[sp.error] ?? sp.error) : "";
  const editLink = (row: { id: number; site: string; section: string; title: string }) => {
    const href = `/admin/s/${row.section}/${row.id}`;
    if (row.site === site.slug) {
      return (
        <Link href={href} className="font-semibold text-white hover:text-accent-light">
          {row.title || "(sin nombre)"}
        </Link>
      );
    }
    if (!canSwitch) return <span className="font-semibold text-white">{row.title || "(sin nombre)"}</span>;
    return (
      <form action={switchSiteAction} className="inline">
        <input type="hidden" name="site" value={row.site} />
        <input type="hidden" name="redirectTo" value={href} />
        <button type="submit" className="text-left font-semibold text-white hover:text-accent-light">
          {row.title || "(sin nombre)"}
        </button>
      </form>
    );
  };

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Precios de Mercado Libre</span>
      </nav>
      <div>
        <h1 className="font-display text-3xl font-bold text-white uppercase">Precios automáticos de Mercado Libre</h1>
        <p className="mt-1 max-w-3xl text-zinc-400">
          Los precios de tus productos se actualizan solos desde Mercado Libre, una vez por día o cada 2 días.{" "}
          <strong className="text-zinc-200">Tus links de afiliado no se modifican nunca</strong>: el botón de compra sigue
          usando tu link; solo cambia el precio que se muestra. Funciona para todos tus sitios.
        </p>
      </div>

      {sp.ok && OK[sp.ok] && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{OK[sp.ok]}</div>
      )}
      {sp.detected !== undefined && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Códigos detectados: {sp.detected}.{" "}
          {Number(sp.failed) > 0 &&
            `${sp.failed} no se pudieron detectar (links cortos o genéricos): edítalos y pega el enlace normal del producto.`}
        </div>
      )}
      {errorText && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{errorText}</div>
      )}

      {/* ─────────── Estado */}
      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">1. Conexión</h2>
        {cfg.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-emerald-300">
              <CircleCheck className="h-5 w-5" /> Conectado
              {cfg.user?.nickname ? (
                <>
                  {" "}
                  como <strong className="text-white">{cfg.user.nickname}</strong>
                </>
              ) : null}{" "}
              · {country.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={syncMlNowAction}>
                <SubmitButton icon={false} pendingLabel="Actualizando…">
                  <RefreshCw className="h-4 w-4" /> Actualizar precios ahora
                </SubmitButton>
              </form>
              <form action={disconnectMlAction}>
                <ConfirmButton message="¿Desconectar tu cuenta de Mercado Libre? Los precios dejarán de actualizarse." className="btn-ghost">
                  <Unlink className="h-4 w-4" /> Desconectar
                </ConfirmButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cfg.tokenError ? (
              <p className="flex items-start gap-2 text-red-300">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {cfg.tokenError}
              </p>
            ) : (
              <p className="text-zinc-300">
                Todavía no conectaste tu cuenta. Mercado Libre exige una aplicación (gratis) para consultar precios: sigue los
                pasos de abajo. Se hace una sola vez.
              </p>
            )}
            {cfg.clientId && cfg.hasSecret && (
              <form action="/api/mercadolibre/connect" method="get">
                <button type="submit" className="btn-primary">
                  <Plug className="h-4 w-4" /> Conectar con Mercado Libre
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* ─────────── Aplicación */}
      <details className="card group p-6" open={!cfg.connected}>
        <summary className="flex cursor-pointer items-center justify-between">
          <span className="font-display text-xl font-bold tracking-wide text-white uppercase">
            2. Aplicación de Mercado Libre {cfg.clientId ? <span className="text-sm font-normal text-emerald-300">· configurada</span> : null}
          </span>
          <span className="text-xs text-zinc-500 group-open:hidden">Ver pasos</span>
        </summary>
        <div className="mt-5 space-y-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>
              Entra a{" "}
              <a
                href={`https://developers.${country.domain}/devcenter`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent-light underline"
              >
                Mercado Libre Developers → Mis aplicaciones
              </a>{" "}
              con tu cuenta (la misma de afiliados) y pulsa <strong>Crear aplicación</strong>.
            </li>
            <li>Completa nombre (ej: “Precios Jomerarte”), nombre corto y descripción.</li>
            <li>
              En <strong>URI de redirección</strong> pega exactamente esta dirección:
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs break-all text-accent-light">
                  {redirectUri}
                </code>
                <CopyButton text={redirectUri} />
              </span>
              {redirectUri.startsWith("http://") && (
                <span className="mt-1 block text-xs text-amber-300">
                  Mercado Libre solo acepta direcciones https: haz este paso desde tu sitio publicado (ej: https://jomerarte.com/admin).
                </span>
              )}
            </li>
            <li>
              En permisos marca <strong>lectura</strong> y <strong>offline_access</strong> (para que la conexión no venza). No
              hace falta activar notificaciones.
            </li>
            <li>
              Guarda y copia el <strong>App ID</strong> y la <strong>Clave secreta</strong> en el formulario de abajo.
            </li>
            <li>
              Pulsa <strong>Conectar con Mercado Libre</strong> y acepta los permisos.
            </li>
          </ol>

          {cfg.credsFromEnv ? (
            <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-400" /> El App ID y la clave se leen de las variables
              ML_CLIENT_ID y ML_CLIENT_SECRET de Vercel.
            </p>
          ) : null}
          <form action={saveMlCredentialsAction} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="ml-country">
                País de tu cuenta
              </label>
              <select id="ml-country" name="country" defaultValue={country.site} className="input">
                {ML_COUNTRIES.map((c) => (
                  <option key={c.site} value={c.site}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {!cfg.credsFromEnv && (
              <>
                <div>
                  <label className="label" htmlFor="ml-id">
                    App ID
                  </label>
                  <input id="ml-id" name="clientId" defaultValue={cfg.clientId} inputMode="numeric" autoComplete="off" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="ml-secret">
                    Clave secreta
                  </label>
                  <input
                    id="ml-secret"
                    name="clientSecret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={cfg.hasSecret ? `${cfg.secretHint} (guardada)` : ""}
                    className="input"
                  />
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <SubmitButton>Guardar</SubmitButton>
            </div>
          </form>
          {cfg.clientId && cfg.hasSecret && (
            <form action="/api/mercadolibre/connect" method="get">
              <button type="submit" className="btn-ghost">
                <Plug className="h-4 w-4" /> {cfg.connected ? "Volver a conectar" : "Conectar con Mercado Libre"}
              </button>
            </form>
          )}
        </div>
      </details>

      {/* ─────────── Frecuencia */}
      <section className="card space-y-5 p-6">
        <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">3. Actualización automática</h2>
        <form action={saveMlFrequencyAction} className="flex flex-wrap items-end gap-4">
          <fieldset className="flex flex-wrap gap-3">
            {([1, 2] as const).map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 has-[:checked]:border-accent has-[:checked]:bg-accent/15">
                <input type="radio" name="frequency" value={d} defaultChecked={cfg.frequency === d} className="accent-[var(--accent)]" />
                {d === 1 ? "Una vez por día" : "Cada 2 días"}
              </label>
            ))}
          </fieldset>
          <SubmitButton>Guardar frecuencia</SubmitButton>
        </form>
        <p className="flex items-start gap-2 text-sm text-zinc-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          Vercel (plan gratuito) ejecuta la actualización una vez por día, cerca de las 6:00 (hora de Argentina). Si elegiste
          “cada 2 días”, se saltea un día. También puedes actualizar a mano cuando quieras.
        </p>
        {cfg.lastRun ? (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
            <p>
              <strong className="text-white">Última actualización:</strong> {when(cfg.lastRun.at, country.tz)} (
              {TRIGGER[cfg.lastRun.trigger] ?? cfg.lastRun.trigger})
            </p>
            <p className="mt-1">
              {cfg.lastRun.total} productos · {cfg.lastRun.updated} cambiaron de precio · {cfg.lastRun.unchanged} sin cambios
              {cfg.lastRun.failed > 0 && <span className="text-red-300"> · {cfg.lastRun.failed} con error</span>}
              {cfg.lastRun.skipped > 0 && <span className="text-amber-300"> · {cfg.lastRun.skipped} pendientes</span>}
            </p>
            {cfg.lastRun.message && <p className="mt-1 text-amber-300">{cfg.lastRun.message}</p>}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Todavía no se hizo ninguna actualización.</p>
        )}
        {!cfg.cronSecret && (
          <p className="text-xs text-zinc-500">
            Recomendado: en Vercel → Settings → Environment Variables crea <code className="text-zinc-300">CRON_SECRET</code>{" "}
            con un texto largo al azar. Así solo Vercel puede iniciar la actualización automática.
          </p>
        )}
      </section>

      {/* ─────────── Productos vinculados */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Productos vinculados ({linked.length})</h2>
            <p className="text-sm text-zinc-500">
              Para vincular un producto, edítalo y completa el recuadro “Precio automático de Mercado Libre”.
            </p>
          </div>
        </div>
        {linked.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">Todavía no hay productos vinculados.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {linked.map((row) => {
              const info = row.mlInfo ?? {};
              const status = mlStatusLabel(info);
              const ref = { id: row.mlId, type: (row.mlType === "product" ? "product" : "item") as MlKind };
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{editLink(row)}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {siteName.get(row.site) ?? row.site} ·{" "}
                      <a href={mlPublicUrl(ref)} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">
                        {row.mlId} {row.mlType === "product" ? "(página de producto)" : "(publicación)"}{" "}
                        <ExternalLink className="inline h-3 w-3" />
                      </a>
                    </p>
                    {info.error ? (
                      <p className="mt-1 text-xs text-red-300">{info.error}</p>
                    ) : info.checkedAt ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Revisado: {when(info.checkedAt, country.tz)}
                        {status && <span className="text-amber-300"> · {status}</span>}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Se revisará en la próxima actualización.</p>
                    )}
                  </div>
                  <span className="font-display text-lg font-bold whitespace-nowrap text-white">{row.price || "—"}</span>
                  <form action={toggleMlItemAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="on" value={row.mlSync ? "0" : "1"} />
                    <button
                      type="submit"
                      className={
                        row.mlSync
                          ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                          : "rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/20"
                      }
                      title="Activar o pausar la actualización automática de este producto"
                    >
                      {row.mlSync ? "Automático" : "Pausado"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─────────── Pendientes */}
      {pending.length > 0 && (
        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">
                Productos de Mercado Libre sin vincular ({pending.length})
              </h2>
              <p className="text-sm text-zinc-500">
                Se detecta el código en los links largos. Los links cortos (meli.la o /sec/) a veces no se pueden abrir desde el
                servidor: en ese caso edita el producto y pega el enlace normal.
              </p>
            </div>
            <form action={detectMlCodesAction}>
              <SubmitButton icon={false} pendingLabel="Detectando…">
                <RefreshCw className="h-4 w-4" /> Detectar códigos automáticamente
              </SubmitButton>
            </form>
          </div>
          <ul className="space-y-1 text-sm">
            {pending.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2">
                {editLink(row)}
                <span className="truncate text-xs text-zinc-500">
                  · {siteName.get(row.site) ?? row.site} · {row.linkUrl}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
