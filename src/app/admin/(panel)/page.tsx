import Link from "next/link";
import { EyeOff, Image as ImageIcon, Plus, Settings, Sparkles, Upload } from "lucide-react";
import { getCustomSections, getPageTexts, getSectionCounts, getSettings } from "@/lib/data";
import { ALL_PAGE_DEFS, GROUPS } from "@/lib/sections";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [counts, pages, settings, customs] = await Promise.all([
    getSectionCounts(),
    getPageTexts(),
    getSettings(),
    getCustomSections(),
  ]);
  const noLogo = !settings.logoUrl && !settings.logoLightUrl;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl font-bold text-white uppercase">Panel de {settings.siteName}</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          Desde aquí editas todo tu sitio: agrega, edita, ordena, oculta o elimina contenido de cada sección, crea páginas
          nuevas donde quieras, cambia los textos de cada página, tu logo, tus datos de contacto y más.
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
              Ahora se muestra una recreación del logo JOMER WORRHIS. Ve a Ajustes → Identidad y logo para subir tus
              imágenes (versión transparente y versión con fondo blanco).
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/ajustes" className="card card-hover flex items-center gap-4 p-5">
          <Settings className="h-7 w-7 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Ajustes y portada</p>
            <p className="text-xs text-zinc-400">Logo, colores, WhatsApp, redes, textos del inicio</p>
          </div>
        </Link>
        <Link href="/admin/medios" className="card card-hover flex items-center gap-4 p-5">
          <ImageIcon className="h-7 w-7 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Archivos subidos</p>
            <p className="text-xs text-zinc-400">Fotos, videos y audios</p>
          </div>
        </Link>
        <Link href="/admin/s/custom/nuevo" className="card card-hover flex items-center gap-4 p-5">
          <Sparkles className="h-7 w-7 text-accent-light" />
          <div>
            <p className="font-semibold text-white">Crear página nueva</p>
            <p className="text-xs text-zinc-400">Elige su tipo y en qué sección del menú va</p>
          </div>
        </Link>
      </div>

      {GROUPS.map((g) => {
        const defs = ALL_PAGE_DEFS.filter((d) => d.group === g.key);
        const extra = customs.filter((c) => c.group === g.key);
        return (
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
              {defs.map((d) => {
                const hidden = pages[d.key]?.visible === false;
                return (
                  <Link key={d.key} href={`/admin/s/${d.key}`} className="card card-hover flex items-center gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
                      <Icon name={d.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white">{pages[d.key]?.navLabel ?? d.navLabel}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {d.key === "custom" ? "Crear y ordenar páginas" : d.path} ·{" "}
                        {d.hub ? "Página principal" : `${counts[d.key] ?? 0} elementos`}
                      </span>
                    </span>
                    {hidden && (
                      <span title="Oculta" className="text-zinc-500">
                        <EyeOff className="h-4 w-4" />
                      </span>
                    )}
                  </Link>
                );
              })}
              {extra.map((c) => (
                <Link
                  key={c.key}
                  href={c.def ? `/admin/s/${c.key}` : `/admin/s/custom/${c.item.id}`}
                  className="card card-hover flex items-center gap-3 border-dashed p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-accent-light">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{c.item.title || c.item.slug}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {c.path} · {c.def ? `${counts[c.key] ?? 0} elementos` : c.type.label}
                    </span>
                  </span>
                  {!c.visible && (
                    <span title="Oculta" className="text-zinc-500">
                      <EyeOff className="h-4 w-4" />
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="card space-y-3 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Consejos</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Para crear una página dentro de una sección (por ejemplo “Emprendedores” en Recomendaciones), usa “Página nueva
            aquí” o “Crear página nueva” y elige su tipo: recomendaciones, productos, servicios, frases, galería, etc.
          </li>
          <li>Para videos largos, súbelos a YouTube y pega el enlace: se verán integrados en tu página.</li>
          <li>Las fotos grandes se reducen automáticamente al subirlas para que la página cargue rápido.</li>
          <li>
            En la tienda, pega el enlace de Mercado Libre, Hotmart, AliExpress, Amazon, etc. y presiona “Autocompletar” para
            traer el título, la foto y el precio.
          </li>
          <li>Marca un elemento como “Destacado” para que aparezca en la portada.</li>
          <li>Puedes ocultar una sección entera desde “Textos de la página” sin borrar su contenido.</li>
          <li>
            Subdominios: si configuras <strong>frases.jomerarte.com</strong> y <strong>cielinfier.jomerarte.com</strong> en tu
            DNS apuntando a este servidor, se abrirán directamente esas secciones.
          </li>
        </ul>
      </section>
    </div>
  );
}
