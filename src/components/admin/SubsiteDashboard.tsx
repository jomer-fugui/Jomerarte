import Link from "next/link";
import { ExternalLink, Eye, EyeOff, Image as ImageIcon, Plus, Settings, Sparkles } from "lucide-react";
import { switchSiteAction } from "@/app/admin/actions";
import { getCustomSections, getSectionCounts, getSettings } from "@/lib/data";
import { siteLabel, siteUrl } from "@/lib/hosts";
import type { SiteContext } from "@/lib/site";
import { Icon } from "../icons";

/** Panel de un subdominio: sus ajustes y sus páginas, independientes del sitio principal. */
export async function SubsiteDashboard({ site, ok }: { site: SiteContext; ok?: string }) {
  const [settings, customs, counts] = await Promise.all([getSettings(), getCustomSections(), getSectionCounts()]);
  const url = siteUrl(site.slug, site.host);
  const homeId = Number(settings.homePage) || 0;

  return (
    <div className="space-y-10">
      {ok === "site" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          ¡Sitio creado! Personaliza su nombre, logo, colores y portada en <strong>Ajustes</strong> y agrega sus páginas.
        </div>
      )}

      <div>
        <p className="eyebrow">Sitio independiente</p>
        <h1 className="mt-2 font-display text-4xl font-bold break-words text-white uppercase">Panel de {settings.siteName}</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          {siteLabel(site.slug)} tiene su propio nombre, logo, colores, portada, menú y páginas. Nada de lo que cambies aquí
          afecta al sitio principal ni a los otros subdominios.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/ajustes" className="card card-hover flex items-center gap-4 p-5">
          <Settings className="h-7 w-7 shrink-0 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Nombre, logo y portada</p>
            <p className="text-xs text-zinc-400">Colores, descripción, contacto y redes de este sitio</p>
          </div>
        </Link>
        <Link href="/admin/s/custom/nuevo" className="card card-hover flex items-center gap-4 p-5">
          <Sparkles className="h-7 w-7 shrink-0 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Crear página</p>
            <p className="text-xs text-zinc-400">Galería, productos, personajes, frases, texto libre…</p>
          </div>
        </Link>
        {site.via === "host" ? (
          <Link href="/" target="_blank" className="card card-hover flex items-center gap-4 p-5">
            <Eye className="h-7 w-7 shrink-0 text-accent-light" />
            <div>
              <p className="font-semibold text-white">Ver sitio</p>
              <p className="text-xs text-zinc-400">Abre la portada de este sitio</p>
            </div>
          </Link>
        ) : (
          <form action={switchSiteAction} className="contents">
            <input type="hidden" name="site" value={site.slug} />
            <input type="hidden" name="redirectTo" value="/" />
            <button type="submit" className="card card-hover flex items-center gap-4 p-5 text-left">
              <Eye className="h-7 w-7 shrink-0 text-accent-light" />
              <div>
                <p className="font-semibold text-white">Vista previa</p>
                <p className="text-xs text-zinc-400">Mira cómo queda, aunque el subdominio no esté conectado</p>
              </div>
            </button>
          </form>
        )}
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="card card-hover flex items-center gap-4 p-5">
            <ExternalLink className="h-7 w-7 shrink-0 text-accent-light" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">Abrir {siteLabel(site.slug)}</p>
              <p className="text-xs text-zinc-400">Funciona cuando el subdominio está conectado en Vercel</p>
            </div>
          </a>
        ) : (
          <Link href="/admin/medios" className="card card-hover flex items-center gap-4 p-5">
            <ImageIcon className="h-7 w-7 shrink-0 text-accent-light" />
            <div>
              <p className="font-semibold text-white">Archivos</p>
              <p className="text-xs text-zinc-400">Fotos, videos y audios</p>
            </div>
          </Link>
        )}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Páginas de este sitio</h2>
          <Link href="/admin/s/custom" className="text-xs font-semibold text-accent-light hover:text-white">
            Ordenar, ocultar o eliminar páginas →
          </Link>
        </div>
        {customs.length === 0 ? (
          <div className="card p-10 text-center text-zinc-400">
            Este sitio todavía no tiene páginas.{" "}
            <Link href="/admin/s/custom/nuevo" className="font-semibold text-accent-light hover:underline">
              Crea la primera
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customs.map((c) => (
              <Link
                key={c.key}
                href={c.def ? `/admin/s/${c.key}` : `/admin/s/custom/${c.item.id}`}
                className="card card-hover flex items-center gap-3 p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {c.item.title || c.item.slug}
                    {c.item.id === homeId && <span className="ml-1.5 text-xs font-normal text-amber-300">· en portada</span>}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {c.path} · {c.def ? `${counts[c.key] ?? 0} elementos` : c.type.label}
                    {c.menuLabel ? ` · menú “${c.menuLabel}”` : ""}
                  </span>
                </span>
                {!c.visible && (
                  <span title="Oculta" className="text-zinc-500">
                    <EyeOff className="h-4 w-4" />
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/admin/s/custom/nuevo"
              className="card card-hover flex items-center justify-center gap-2 border-dashed p-4 text-sm font-semibold text-accent-light"
            >
              <Plus className="h-4 w-4" /> Página nueva
            </Link>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Consejos</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            En <strong>Ajustes → Portada</strong> elige qué página se muestra en la portada de este sitio (por ejemplo la
            galería o la tienda).
          </li>
          <li>
            Al crear una página puedes escribir una <strong>sección del menú</strong>: las páginas con la misma sección se
            agrupan en un menú desplegable. Si la dejas vacía, aparece como enlace directo.
          </li>
          <li>
            Para que {siteLabel(site.slug)} funcione en internet, agrégalo en Vercel → Settings → Domains (ver
            “Sitios” en el menú del panel).
          </li>
        </ul>
      </section>
    </div>
  );
}
