import Link from "next/link";
import {
  ClipboardList,
  EyeOff,
  Globe,
  Image as ImageIcon,
  ListOrdered,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { getMenuModel, getSectionCounts, getSettings } from "@/lib/data";
import { getMlConfig } from "@/lib/mercadolibre";
import { countUnreadFeedback } from "@/lib/feedback";
import { countUnreadSubmissions } from "@/lib/forms";
import { getCurrentSite, getSiteSlugs } from "@/lib/site";
import { Icon } from "@/components/icons";
import { SubsiteDashboard } from "@/components/admin/SubsiteDashboard";

export const dynamic = "force-dynamic";

function QuickCard({ href, icon: I, title, text, tone }: { href: string; icon: LucideIcon; title: string; text: string; tone?: string }) {
  return (
    <Link href={href} className="card card-hover flex items-center gap-4 p-5">
      <I className="h-7 w-7 shrink-0 text-accent-light" />
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className={tone ?? "text-xs text-zinc-400"}>{text}</p>
      </div>
    </Link>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [site, { ok }] = await Promise.all([getCurrentSite(), searchParams]);
  // Cada subdominio tiene su propio panel
  if (!site.isMain) return <SubsiteDashboard site={site} ok={ok} />;

  const [counts, settings, menu, subsites, mlCfg, unread, unreadForms] = await Promise.all([
    getSectionCounts(),
    getSettings(),
    getMenuModel(),
    getSiteSlugs(),
    getMlConfig(),
    countUnreadFeedback(site.slug),
    countUnreadSubmissions(site.slug),
  ]);
  const noLogo = !settings.logoUrl && !settings.logoLightUrl;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl font-bold text-white uppercase">Panel de {settings.siteName}</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          Desde aquí editas todo tu sitio: agrega, edita, ordena, oculta o elimina contenido de cada sección, crea páginas
          nuevas donde quieras, edita también las páginas predeterminadas, ordena el menú, cambia tu logo, tus datos de contacto
          y más.
        </p>
      </div>

      {noLogo && (
        <Link
          href="/admin/ajustes"
          className="flex items-center gap-4 rounded-2xl border border-accent/50 bg-accent/10 p-5 transition hover:bg-accent/20"
        >
          <Upload className="h-8 w-8 shrink-0 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Sube tu logo original</p>
            <p className="text-sm text-zinc-300">
              Ahora se muestra una recreación del logo JOMER WORRHIS. Ve a Ajustes → Identidad y logo para subir tus imágenes
              (versión transparente y versión con fondo blanco).
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickCard href="/admin/ajustes" icon={Settings} title="Ajustes y portada" text="Logo, colores, WhatsApp, redes, textos del inicio" />
        <QuickCard href="/admin/menu" icon={ListOrdered} title="Menú y orden" text="Ordena secciones y páginas, renómbralas o muévelas" />
        <QuickCard href="/admin/s/custom/nuevo" icon={Sparkles} title="Crear página nueva" text="Elige su tipo y en qué sección del menú va" />
        <QuickCard
          href="/admin/opiniones"
          icon={Star}
          title="Opiniones"
          text={unread > 0 ? `${unread} sin leer · reseñas de Google y comentarios` : "Reseñas de Google y comentarios privados"}
        />
        <QuickCard
          href="/admin/formularios"
          icon={ClipboardList}
          title="Formularios"
          text={unreadForms > 0 ? `${unreadForms} sin leer · envíos de los formularios` : "Envíos de las páginas con formulario"}
        />
        <QuickCard href="/admin/medios" icon={ImageIcon} title="Archivos subidos" text="Fotos, videos y audios" />
        <QuickCard
          href="/admin/sitios"
          icon={Globe}
          title="Subdominios"
          text={`${subsites.length} ${subsites.length === 1 ? "sitio independiente" : "sitios independientes"} · crear otro`}
        />
        <QuickCard
          href="/admin/mercadolibre"
          icon={Tag}
          title="Precios de Mercado Libre"
          text={mlCfg.connected ? "Conectado · se actualizan solos" : "Actualízalos solos sin tocar tu link"}
          tone={mlCfg.connected ? "text-xs text-emerald-300" : undefined}
        />
        <QuickCard href="/admin/seo" icon={Search} title="Google e IA" text="Que te encuentren y recomienden en tu zona" />
      </div>

      <p className="text-sm text-zinc-500">
        Las secciones y páginas aparecen en el mismo orden que en el menú del sitio. Para cambiarlo usa{" "}
        <Link href="/admin/menu" className="font-semibold text-accent-light hover:underline">
          Menú y orden
        </Link>
        .
      </p>

      {menu.groups.map((g) => (
        <section key={g.key}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-white uppercase">
              <Icon name={g.icon} className="h-5 w-5 text-accent-light" /> {g.label}
            </h2>
            <Link
              href={`/admin/s/custom/nuevo?grupo=${g.key}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-light hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Página nueva aquí
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.hub && (
              <Link href={`/admin/pagina/${g.hub.key}`} className="card card-hover flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
                  <Icon name={g.hub.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{g.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{g.hub.path} · Página principal</span>
                </span>
                {!g.hubVisible && (
                  <span title="Oculta" className="text-zinc-500">
                    <EyeOff className="h-4 w-4" />
                  </span>
                )}
              </Link>
            )}
            {g.entries.map((e) => {
              const href =
                e.kind === "fixed" || e.def ? `/admin/s/${e.key}` : `/admin/s/custom/${e.custom?.item.id ?? ""}`;
              const detail = e.def ? `${counts[e.key] ?? 0} elementos` : (e.custom?.type.label ?? "Página");
              return (
                <Link
                  key={e.key}
                  href={href}
                  className={
                    e.kind === "custom"
                      ? "card card-hover flex items-center gap-3 border-dashed p-4"
                      : "card card-hover flex items-center gap-3 p-4"
                  }
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
                    <Icon name={e.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{e.navLabel}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {e.path} · {detail}
                    </span>
                  </span>
                  {!e.visible && (
                    <span title="Oculta" className="text-zinc-500">
                      <EyeOff className="h-4 w-4" />
                    </span>
                  )}
                </Link>
              );
            })}
            {g.key === "mas" && (
              <Link href="/admin/s/custom" className="card card-hover flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
                  <Icon name="file" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">Páginas personalizadas</span>
                  <span className="block truncate text-xs text-zinc-500">Todas las páginas que creaste · {counts.custom ?? 0}</span>
                </span>
              </Link>
            )}
          </div>
        </section>
      ))}

      <section className="card space-y-3 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Consejos</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            En <strong>Menú y orden</strong> puedes ordenar todas las páginas (también las predeterminadas), renombrar las
            secciones del menú, ocultar páginas o moverlas a otra sección.
          </li>
          <li>
            Cada página predeterminada tiene su botón <strong>“Editar nombre, textos, imagen, ícono y ubicación”</strong> dentro
            de su sección.
          </li>
          <li>
            En cada sección con categorías, abre <strong>“Categorías”</strong> para elegir el orden (alfabético, más usadas o
            personalizado) y cómo se muestran: deslizables, en un botón desplegable o todas visibles.
          </li>
          <li>
            Los <strong>destacados</strong> de la portada se eligen al azar en cada visita (máximo 8). Marca más elementos como
            destacados para que vayan cambiando.
          </li>
          <li>
            Cada <strong>subdominio</strong> (frases, cielinfier o los que crees, como juegos) es un sitio independiente: elígelo
            arriba en el selector de sitio para editarlo sin tocar este sitio.
          </li>
          <li>Para videos largos, súbelos a YouTube y pega el enlace: se verán integrados en tu página.</li>
        </ul>
      </section>
    </div>
  );
}
