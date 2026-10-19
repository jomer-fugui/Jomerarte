import Link from "next/link";
import { ExternalLink, Eye, Globe, Pencil, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/client";
import { CreateSiteForm } from "@/components/admin/CreateSiteForm";
import { rootDomain, siteLabel, siteUrl } from "@/lib/hosts";
import { getCurrentSite, getSitesOverview } from "@/lib/site";
import { deleteSiteAction, switchSiteAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SitesPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [site, overview, { ok }] = await Promise.all([getCurrentSite(), getSitesOverview(), searchParams]);
  const locked = site.via === "host";
  const root = rootDomain();
  const example = `juegos.${root ?? "jomerarte.com"}`;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Sitios y subdominios</span>
      </nav>
      <div>
        <h1 className="font-display text-3xl font-bold text-white uppercase">Sitios y subdominios</h1>
        <p className="mt-1 max-w-3xl text-zinc-400">
          Cada subdominio es un sitio independiente: tiene su propio nombre, logo, colores, portada, descripción, menú,
          páginas y contenido. Lo que cambies en uno no afecta a los demás.
        </p>
      </div>

      {ok === "deleted" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">Sitio eliminado.</div>
      )}

      <section className="card divide-y divide-white/5 overflow-hidden">
        {overview.map((s) => {
          const url = siteUrl(s.slug, site.host);
          const editing = s.slug === site.slug;
          return (
            <div key={s.slug || "principal"} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-light">
                <Globe className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                  {s.name}
                  {!s.slug && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 uppercase">Principal</span>
                  )}
                  {editing && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">Editando</span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {siteLabel(s.slug)} · {s.pages} {s.pages === 1 ? "página propia" : "páginas propias"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!locked && (
                  <>
                    <form action={switchSiteAction}>
                      <input type="hidden" name="site" value={s.slug} />
                      <input type="hidden" name="redirectTo" value="/admin" />
                      <button type="submit" className="btn-ghost btn-sm">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                    </form>
                    <form action={switchSiteAction}>
                      <input type="hidden" name="site" value={s.slug} />
                      <input type="hidden" name="redirectTo" value="/" />
                      <button type="submit" className="btn-ghost btn-sm">
                        <Eye className="h-3.5 w-3.5" /> Vista previa
                      </button>
                    </form>
                  </>
                )}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                )}
                {s.slug && !locked && (
                  <form action={deleteSiteAction}>
                    <input type="hidden" name="site" value={s.slug} />
                    <ConfirmButton
                      message={`¿Eliminar ${siteLabel(s.slug)} con todas sus páginas, contenido y ajustes? No se puede deshacer.`}
                      className="btn-ghost btn-sm text-red-300 hover:bg-red-500/20"
                      title="Eliminar sitio"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {locked ? (
        <p className="text-sm text-zinc-500">Para crear o eliminar subdominios entra al panel del sitio principal.</p>
      ) : (
        <CreateSiteForm root={root ?? "jomerarte.com"} />
      )}

      <section className="card space-y-3 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Cómo publicar un subdominio en internet</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            En Vercel abre tu proyecto → <strong>Settings → Domains</strong> → <strong>Add</strong> y escribe el subdominio,
            por ejemplo <code className="rounded bg-black/50 px-1.5 py-0.5 text-accent-light">{example}</code>.
          </li>
          <li>
            Crea en tu proveedor del dominio el registro DNS que Vercel te indique (normalmente un <strong>CNAME</strong>).
          </li>
          <li>Listo: el sitio reconoce el subdominio solo. No hace falta volver a desplegar.</li>
        </ol>
        <p>
          Mientras tanto usa <strong>Vista previa</strong> para verlo y <strong>Editar</strong> para cambiarlo desde aquí.
        </p>
        {!root && (
          <p className="text-amber-300">
            Configura la variable NEXT_PUBLIC_SITE_URL=https://jomerarte.com en Vercel: así funcionan los botones “Abrir” y
            la sesión del panel sirve en todos los subdominios.
          </p>
        )}
      </section>
    </div>
  );
}
