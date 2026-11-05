import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { homeCatalogNode, jsonLdGraph, pageMetadata, twitterHandle } from "@/lib/seo";
import { cachedDefaultSeo, cachedSeoContext } from "@/lib/seo-server";
import { ArrowRight, ChevronDown, CircleHelp, Heart, Quote } from "lucide-react";
import { siteFromSlug } from "@/lib/site";
import {
  cachedCustomSections,
  cachedFeatured,
  cachedItems,
  cachedMenuModel,
  cachedPageTexts,
  cachedRandomItem,
  cachedSettings,
} from "@/lib/data";
import { excerpt, itemCategories } from "@/lib/format";
import { groupEntries } from "@/lib/nav";
import { PLATFORMS } from "@/lib/platforms";
import { getPageDef, type IconName, type SectionDef } from "@/lib/sections";
import { SiteLogo } from "@/components/Logo";
import { Icon } from "@/components/icons";
import { ContactButton, ItemImage, PlatformBadge, RichText, SectionHeading } from "@/components/ui";
import { AdminTools } from "@/components/AdminTools";
import { itemPath } from "@/components/views/SectionView";
import { SubsiteHome } from "@/components/views/SubsiteHome";

export const revalidate = 300;

/** Portada (del sitio principal o de un subdominio): dirección canónica y datos para compartir. */
export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = await siteFromSlug((await params).site);
  const d = await cachedDefaultSeo(site.slug);
  const meta = pageMetadata({
    title: d.title,
    description: d.description,
    path: "/",
    image: d.image,
    siteName: d.settings.siteName,
    locale: d.locale,
    handle: twitterHandle(d.settings.twitter),
  });
  return { ...meta, title: { absolute: d.title } };
}

const EXPLORE_KEYS = [
  "recomendacion",
  "truchadas",
  "frases",
  "poesias",
  "colmos",
  "mis-paginas",
  "canciones",
  "inventos",
  "precios-servicios",
  "precios-productos",
  "donacion",
];

export default async function HomePage({ params }: { params: Promise<{ site: string }> }) {
  const site = await siteFromSlug((await params).site);
  // Los subdominios tienen su propia portada
  if (!site.isMain) return <SubsiteHome siteSlug={site.slug} />;

  const slug = site.slug;
  const [settings, pages, menu, frase, pregunta, characters, inventos, customs] = await Promise.all([
    cachedSettings(slug),
    cachedPageTexts(slug),
    cachedMenuModel(slug),
    cachedRandomItem(slug, "frases"),
    cachedRandomItem(slug, "colmos"),
    cachedItems(slug, "cielinfier-personajes", { limit: 4 }),
    cachedItems(slug, "inventos", { limit: 3 }),
    cachedCustomSections(slug),
  ]);
  const visibleCustoms = customs.filter((c) => c.visible);
  const vis = (k: string) => pages[k]?.visible !== false;
  const services = groupEntries(menu, "servicios");
  const storeLinks = groupEntries(menu, "tienda");

  const explore: { key: string; href: string; label: string; icon: IconName }[] = [];
  for (const k of EXPLORE_KEYS) {
    const def = getPageDef(k);
    if (def && vis(k)) explore.push({ key: k, href: def.path, label: pages[k]?.navLabel ?? def.navLabel, icon: pages[k]?.icon ?? def.icon });
  }
  for (const c of visibleCustoms) {
    if (c.group === "mas" || c.group === "frases" || c.group === "cielinfier") {
      explore.push({ key: c.key, href: c.path, label: pages[c.key]?.navLabel ?? c.item.title, icon: c.icon });
    }
  }

  const defs = new Map<string, SectionDef>();
  for (const g of menu.groups) for (const e of g.entries) if (e.def && e.visible) defs.set(e.key, e.def);
  // Máximo 8 destacados, elegidos al azar en cada visita entre las secciones visibles
  const featured = await cachedFeatured(slug, 8, [...defs.keys()]);
  const seo = await cachedSeoContext(slug);
  const catalog = jsonLdGraph([homeCatalogNode(seo, services.map((e) => ({ title: e.title, intro: e.intro, path: e.path })))]);

  const ciel = pages["cielinfier-personajes"];
  const preguntasPath = getPageDef("colmos")?.path ?? "/Frases/Preguntas";
  const storePlatforms = PLATFORMS.filter((p) =>
    ["mercadolibre", "hotmart", "aliexpress", "amazon", "temu", "udemy"].includes(p.key),
  );

  return (
    <>
      <JsonLd data={catalog} />
      {/* ─────────── HERO */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {settings.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.heroImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/30 via-zinc-950/60 to-zinc-950" />
        <div className="container-x grid min-h-[calc(100svh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">{settings.tagline}</p>
            <h1 className="mt-5 font-brand text-5xl leading-none text-white text-glow sm:text-7xl xl:text-8xl">
              {settings.siteName.toUpperCase()}
            </h1>
            <h2 className="mt-6 max-w-2xl font-display text-2xl leading-tight font-semibold text-zinc-100 sm:text-3xl">
              {settings.heroTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">{settings.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/Servicios" className="btn-primary px-6 py-3">
                Ver servicios <ArrowRight className="h-4 w-4" />
              </Link>
              <ContactButton settings={settings} label="Escríbeme" className="px-6 py-3" />
              <Link href="/Tienda" className="btn-ghost px-6 py-3">
                Tienda
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {services.map((s) => (
                <Link key={s.key} href={s.path} className="chip hover:border-accent hover:text-white">
                  <Icon name={s.icon} className="h-3.5 w-3.5 text-accent-light" /> {s.navLabel}
                </Link>
              ))}
              {vis("cielinfier-personajes") && (
                <Link href="/Cielinfier" className="chip hover:border-accent hover:text-white">
                  <Icon name="flame" className="h-3.5 w-3.5 text-accent-light" /> CielInfier
                </Link>
              )}
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
            <div className="absolute inset-[10%] animate-glow rounded-full bg-accent/40 blur-3xl" />
            <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/15" />
            <div className="absolute inset-[5%] rounded-full border border-accent/30" />
            <div className="relative h-full w-full animate-float p-[9%]">
              <SiteLogo settings={settings} prefer="light" className="h-full w-full" idPrefix="hero" />
            </div>
            <span className="vertical-text absolute top-1/2 -right-6 hidden -translate-y-1/2 font-brand text-xs tracking-[0.5em] text-white/25 sm:block">
              誤解された天才
            </span>
          </div>
        </div>
      </section>

      {/* ─────────── SERVICIOS */}
      {services.length > 0 && (
        <section className="container-x py-20">
          <SectionHeading eyebrow="Servicios" title="¿En qué te puedo ayudar?" href="/Servicios" linkLabel="Todos los servicios" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.key} href={s.path} className="card card-hover group flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <ItemImage
                    src={s.image}
                    alt={s.title}
                    icon={s.icon}
                    className="transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950/90 to-transparent" />
                  <span className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30">
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl leading-tight font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{excerpt(s.intro, 110)}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-accent-light">
                    Ver más <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── DESTACADOS */}
      {featured.length > 0 && (
        <section className="container-x pb-20">
          <SectionHeading eyebrow="Destacados" title="Lo más buscado" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((it) => {
              const sec = defs.get(it.section);
              if (!sec || !vis(sec.key)) return null;
              const href = sec.detail ? itemPath(sec.path, it) : sec.path;
              return (
                <Link key={it.id} href={href} className="card card-hover group flex flex-col overflow-hidden">
                  <div className="relative aspect-video overflow-hidden">
                    <ItemImage
                      src={it.imageUrl}
                      alt={it.title}
                      icon={sec.icon}
                      label={it.title}
                      className="transition duration-700 group-hover:scale-105"
                    />
                    {it.platform && <PlatformBadge platform={it.platform} className="absolute top-3 left-3" />}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[11px] font-semibold tracking-widest text-accent-light uppercase">
                      {pages[sec.key]?.navLabel ?? sec.navLabel}
                    </p>
                    <h3 className="mt-1 font-display text-xl leading-tight font-bold text-white">{it.title}</h3>
                    {it.subtitle && <p className="mt-1 text-sm text-zinc-400">{excerpt(it.subtitle, 80)}</p>}
                    {it.price && <p className="mt-auto pt-3 font-display text-lg font-bold text-white">{it.price}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────── TIENDA */}
      {vis("tienda") && (
        <section className="container-x pb-20">
          <div className="card grid overflow-hidden lg:grid-cols-2">
            <div className="relative min-h-64">
              <ItemImage src={pages.tienda.imageUrl} alt="Tienda" icon="store" className="absolute inset-0" />
              <div className="absolute inset-0 bg-linear-to-r from-transparent to-zinc-900/80 max-lg:bg-linear-to-t" />
            </div>
            <div className="p-8 sm:p-10">
              <p className="eyebrow">Tienda</p>
              <h2 className="h-section mt-2">{pages.tienda.title}</h2>
              <p className="mt-4 text-zinc-300">{excerpt(pages.tienda.intro, 220)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {storePlatforms.map((p) => (
                  <PlatformBadge key={p.key} platform={p.key} />
                ))}
              </div>
              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {storeLinks.map((e) => (
                  <Link
                    key={e.key}
                    href={e.path}
                    className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-accent/60 hover:text-white"
                  >
                    <Icon name={e.icon} className="h-4 w-4 text-accent-light" />
                    <span className="flex-1">{e.navLabel}</span>
                    <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────── CIELINFIER */}
      {vis("cielinfier-personajes") && (
        <section className="relative isolate overflow-hidden border-y border-white/10">
          {ciel.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ciel.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />
          )}
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/40" />
          <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Anime · Videojuego en desarrollo</p>
              <h2 className="mt-3 font-brand text-5xl text-white text-glow sm:text-6xl">CielInfier</h2>
              <p className="mt-5 max-w-xl text-lg text-zinc-300">{excerpt(ciel.intro, 240)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/Cielinfier" className="btn-primary">
                  Personajes
                </Link>
                {vis("cielinfier-historia") && (
                  <Link href="/Cielinfier/historia" className="btn-ghost">
                    Historia
                  </Link>
                )}
                {vis("cielinfier-proceso") && (
                  <Link href="/Cielinfier/proceso" className="btn-ghost">
                    Proceso del proyecto
                  </Link>
                )}
              </div>
            </div>
            {characters.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {characters.slice(0, 4).map((c, i) => (
                  <Link
                    key={c.id}
                    href={itemPath("/Cielinfier", c)}
                    className={`group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 ${
                      i % 2 === 1 ? "translate-y-6" : ""
                    }`}
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={c.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="placeholder-art absolute inset-0 grid place-items-center">
                        <span className="font-brand text-6xl text-white/15">{c.title.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-display text-2xl font-bold text-white uppercase">{c.title}</p>
                      {c.subtitle && <p className="text-xs text-zinc-300">{c.subtitle}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────── FRASE + PREGUNTA */}
      {(frase || pregunta) && (
        <section className="container-x grid gap-6 py-20 lg:grid-cols-3">
          {frase && vis("frases") && (
            <figure className="card relative overflow-hidden p-8 sm:p-10 lg:col-span-2">
              <Quote className="absolute -top-4 -right-4 h-40 w-40 text-white/[0.04]" />
              <p className="eyebrow">Frase de un Hereje</p>
              <blockquote className="mt-4 font-display text-3xl leading-tight font-bold text-white sm:text-4xl">
                “{frase.content}”
              </blockquote>
              <figcaption className="mt-6 flex flex-wrap items-center gap-3">
                {itemCategories(frase).map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
                <Link href="/Frases" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-light hover:text-white">
                  Leer todas las frases <ArrowRight className="h-4 w-4" />
                </Link>
              </figcaption>
            </figure>
          )}
          {pregunta && vis("colmos") && (
            <details className="card group p-8">
              <summary>
                <CircleHelp className="h-8 w-8 text-accent-light" />
                <p className="eyebrow mt-4">Pregunta del día</p>
                <p className="mt-3 font-display text-2xl leading-tight font-bold text-white">{pregunta.title}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-zinc-400 group-open:hidden">
                  Ver respuesta <ChevronDown className="h-4 w-4" />
                </span>
              </summary>
              <p className="mt-4 border-t border-white/10 pt-4 text-lg font-medium text-accent-light">{pregunta.content}</p>
              <Link href={preguntasPath} className="mt-4 inline-flex text-sm font-semibold text-zinc-300 hover:text-white">
                Más preguntas →
              </Link>
            </details>
          )}
        </section>
      )}

      {/* ─────────── INVENTOS */}
      {inventos.length > 0 && vis("inventos") && (
        <section className="container-x pb-20">
          <SectionHeading eyebrow="Inventos" title={pages.inventos.title} href="/inventos" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {inventos.map((it) => (
              <Link key={it.id} href={itemPath("/inventos", it)} className="card card-hover group overflow-hidden">
                <div className="aspect-video overflow-hidden">
                  <ItemImage
                    src={it.imageUrl}
                    alt={it.title}
                    icon="lightbulb"
                    label={it.title}
                    className="transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  {itemCategories(it)[0] && <span className="chip">{itemCategories(it)[0]}</span>}
                  <h3 className="mt-2 font-display text-xl font-bold text-white">{it.title}</h3>
                  {it.subtitle && <p className="text-sm text-zinc-400">{it.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── EXPLORA */}
      <section className="container-x pb-20">
        <SectionHeading eyebrow="Explora" title="Todo Jomerarte" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {explore.map((e) => (
            <Link key={e.key} href={e.href} className="card card-hover group flex flex-col items-start gap-3 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-light transition group-hover:bg-accent group-hover:text-white">
                <Icon name={e.icon} className="h-5 w-5" />
              </span>
              <span className="font-display text-lg leading-tight font-bold text-white">{e.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────── SOBRE MÍ */}
      <section className="container-x pb-20">
        <div className="card grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[18rem_1fr]">
          <div className="mx-auto w-56 lg:w-full">
            {settings.aboutImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.aboutImage} alt={settings.aboutTitle} className="aspect-square w-full rounded-2xl object-cover" />
            ) : (
              <SiteLogo settings={settings} prefer="light" className="aspect-square w-full" idPrefix="about" />
            )}
          </div>
          <div>
            <p className="eyebrow">Sobre mí</p>
            <h2 className="h-section mt-2">{settings.aboutTitle}</h2>
            <RichText text={settings.aboutText} className="mt-5 text-lg text-zinc-300" />
            <div className="mt-7 flex flex-wrap gap-3">
              <ContactButton settings={settings} label="Contactar" />
              <Link href="/PreciosServicios" className="btn-ghost">
                Ver precios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── DONACIÓN */}
      {vis("donacion") && (
        <section className="container-x pb-8">
          <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-linear-to-br from-accent/30 via-zinc-900 to-zinc-950 p-10 text-center sm:p-14">
            <Heart className="mx-auto h-10 w-10 fill-accent text-accent" />
            <h2 className="h-section mt-4">{pages.donacion.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-300">{excerpt(pages.donacion.intro, 220)}</p>
            <Link href="/Donacion" className="btn-primary mt-8 px-8 py-3">
              Quiero donar
            </Link>
          </div>
        </section>
      )}

      <AdminTools href="/admin/ajustes" label="Editar portada" />
    </>
  );
}
