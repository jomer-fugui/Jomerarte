import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { getCustomSections, getFeatured, getItems, getPageTexts, getSettings, type CustomSection, type Item } from "@/lib/data";
import { excerpt } from "@/lib/format";
import type { SectionDef } from "@/lib/sections";
import { Gallery } from "../client";
import { JsonLd } from "../JsonLd";
import { absUrl, hubPageNodes, jsonLdGraph, listPageNodes } from "@/lib/seo";
import { getSeoContext } from "@/lib/seo-server";
import { LinkButtons } from "../LinkButtons";
import { SiteLogo } from "../Logo";
import { Icon } from "../icons";
import { MediaPlayer } from "../media";
import { AdminFab, ContactButton, ItemImage, PlatformBadge, RichText, SectionHeading, SmartLink } from "../ui";
import { SectionBody, itemPath } from "./SectionView";

/** Portada de un subdominio: un sitio independiente con su propio nombre, logo, portada y páginas. */
export async function SubsiteHome({ category, query }: { category?: string; query?: string } = {}) {
  const [settings, pages, customs, admin] = await Promise.all([
    getSettings(),
    getPageTexts(),
    getCustomSections(),
    isAdmin(),
  ]);
  const visible = customs.filter((c) => c.visible);
  const homeId = Number(settings.homePage) || 0;
  const home = visible.find((c) => c.item.id === homeId) ?? null;
  const homeItems: Item[] = home?.def ? await getItems(home.def.key) : [];
  const others = visible.filter((c) => c.key !== home?.key);
  const label = (c: CustomSection) => pages[c.key]?.navLabel || c.item.title || c.item.slug;
  const defs = new Map<string, SectionDef>();
  for (const c of visible) if (c.def) defs.set(c.key, c.def);
  // Máximo 8 destacados, elegidos al azar en cada visita
  const featured = await getFeatured(8, [...defs.keys()]);
  const featuredCards = featured.flatMap((it) => {
    const sec = defs.get(it.section);
    return sec ? [{ it, sec }] : [];
  });
  const seo = await getSeoContext();
  const homeUrl = `${seo.base}/`;
  const homeDescription = settings.seoDescription || settings.heroText || settings.tagline || undefined;
  const ld = jsonLdGraph(
    home?.def
      ? listPageNodes(seo, {
          section: home.def,
          items: homeItems,
          url: homeUrl,
          name: settings.siteName,
          description: homeDescription,
          image: absUrl(seo.base, settings.heroImage),
        })
      : hubPageNodes(seo, {
          url: homeUrl,
          name: settings.siteName,
          description: homeDescription,
          image: absUrl(seo.base, settings.heroImage),
          entries: visible.map((c) => ({ title: label(c), path: c.path, intro: c.item.subtitle })),
        }),
  );
  const showHeroTitle =
    settings.heroTitle.trim() !== "" && settings.heroTitle.trim().toLowerCase() !== settings.siteName.trim().toLowerCase();

  return (
    <>
      <JsonLd data={ld} />
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {settings.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.heroImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/30 via-zinc-950/70 to-zinc-950" />
        <div className="container-x grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            {settings.tagline && <p className="eyebrow">{settings.tagline}</p>}
            <h1 className="mt-4 font-brand text-4xl leading-tight break-words text-white text-glow sm:text-6xl">
              {settings.siteName.toUpperCase()}
            </h1>
            {showHeroTitle && (
              <h2 className="mt-5 max-w-2xl font-display text-2xl leading-tight font-semibold text-zinc-100 sm:text-3xl">
                {settings.heroTitle}
              </h2>
            )}
            {settings.heroText && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">{settings.heroText}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {visible.slice(0, 3).map((c, i) => (
                <Link key={c.key} href={c.path} className={i === 0 ? "btn-primary" : "btn-ghost"}>
                  {label(c)}
                  {i === 0 && <ArrowRight className="h-4 w-4" />}
                </Link>
              ))}
              <ContactButton settings={settings} label="Contacto" />
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[22rem]">
            <div className="absolute inset-[12%] animate-glow rounded-full bg-accent/40 blur-3xl" />
            <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/15" />
            <div className="relative h-full w-full animate-float p-[10%]">
              <SiteLogo settings={settings} prefer="light" className="h-full w-full" idPrefix="subhero" />
            </div>
          </div>
        </div>
      </section>

      {home && (
        <section className="container-x py-16">
          <SectionHeading eyebrow={settings.siteName} title={label(home)} href={home.path} linkLabel="Abrir página" />
          {home.item.subtitle && <RichText text={home.item.subtitle} className="mt-3 max-w-3xl text-zinc-400" />}
          <div className="mt-8">
            {home.def ? (
              <SectionBody section={home.def} items={homeItems} settings={settings} admin={admin} category={category} query={query} />
            ) : (
              <div className="space-y-10">
                <RichText text={home.item.content} className="max-w-3xl text-lg text-zinc-300" />
                <LinkButtons links={home.item.links} />
                {home.item.videoUrl && <MediaPlayer url={home.item.videoUrl} title={home.item.title} className="max-w-4xl" />}
                {home.item.gallery.length > 0 && <Gallery urls={home.item.gallery} title={home.item.title} />}
                {home.item.linkUrl && (
                  <SmartLink href={home.item.linkUrl} className="btn-primary">
                    {home.item.linkLabel || "Ver más"}
                  </SmartLink>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className={home ? "container-x pb-16" : "container-x py-16"}>
          <SectionHeading eyebrow="Explora" title={home ? "Más páginas" : "Páginas"} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <Link key={c.key} href={c.path} className="card card-hover group flex flex-col overflow-hidden">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <ItemImage
                    src={c.item.imageUrl}
                    alt={label(c)}
                    icon={c.icon}
                    label={label(c)}
                    className="transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-accent/90 text-white">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl leading-tight font-bold text-white">{label(c)}</h3>
                  {c.item.subtitle && <p className="mt-2 text-sm text-zinc-400">{excerpt(c.item.subtitle, 120)}</p>}
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-accent-light">
                    Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 && (
        <section className="container-x py-16">
          <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
            <p className="font-display text-2xl font-bold text-white uppercase">Próximamente</p>
            <p className="max-w-md text-zinc-400">Este sitio todavía no tiene páginas publicadas. ¡Vuelve pronto!</p>
            {admin && (
              <Link href="/admin/s/custom/nuevo" className="btn-primary mt-2">
                <Plus className="h-4 w-4" /> Crear la primera página
              </Link>
            )}
          </div>
        </section>
      )}

      {featuredCards.length > 0 && (
        <section className="container-x pb-16">
          <SectionHeading eyebrow="Destacados" title="Lo más destacado" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCards.map(({ it, sec }) => (
              <Link
                key={it.id}
                href={sec.detail ? itemPath(sec.path, it) : sec.path}
                className="card card-hover group flex flex-col overflow-hidden"
              >
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
                  <p className="text-[11px] font-semibold tracking-widest text-accent-light uppercase">{sec.navLabel}</p>
                  <h3 className="mt-1 font-display text-xl leading-tight font-bold text-white">{it.title}</h3>
                  {it.subtitle && <p className="mt-1 text-sm text-zinc-400">{excerpt(it.subtitle, 80)}</p>}
                  {it.price && <p className="mt-auto pt-3 font-display text-lg font-bold text-white">{it.price}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(settings.aboutTitle || settings.aboutText) && (
        <section className="container-x pb-16">
          <div className="card grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[14rem_1fr]">
            <div className="mx-auto w-44 lg:w-full">
              {settings.aboutImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.aboutImage} alt={settings.aboutTitle} className="aspect-square w-full rounded-2xl object-cover" />
              ) : (
                <SiteLogo settings={settings} prefer="light" className="aspect-square w-full" idPrefix="subabout" />
              )}
            </div>
            <div>
              {settings.aboutTitle && <h2 className="h-section">{settings.aboutTitle}</h2>}
              <RichText text={settings.aboutText} className="mt-4 text-lg text-zinc-300" />
              <div className="mt-6">
                <ContactButton settings={settings} label="Contactar" />
              </div>
            </div>
          </div>
        </section>
      )}

      {admin && <AdminFab href="/admin/ajustes" label="Editar portada" />}
    </>
  );
}
