import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  cachedCustomSections,
  cachedItems,
  cachedMenuModel,
  cachedPageTexts,
  cachedSettings,
  getItem,
  resolveCustomPath,
  type CustomSection,
  type PageText,
} from "@/lib/data";
import { excerpt, foldText } from "@/lib/format";
import { buildSubsiteTabs, buildTabs, groupEntries, menuCrumbs, menuEyebrow, withPageText } from "@/lib/nav";
import { resolvePath } from "@/lib/sections";
import {
  absUrl,
  breadcrumbNode,
  detailPageNodes,
  detailPath,
  hubPageNodes,
  itemDescription,
  itemImage,
  jsonLdGraph,
  listPageNodes,
  pageMetadata,
  twitterHandle,
  webPageNode,
} from "@/lib/seo";
import { cachedDefaultSeo, cachedSeoContext } from "@/lib/seo-server";
import { siteFromSlug, type SiteContext } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { CustomPageView, HubView, ItemDetailView, SectionPage, itemPath } from "@/components/views/PageViews";
import { SubsiteHome } from "@/components/views/SubsiteHome";

export const revalidate = 300;

type Props = {
  params: Promise<{ site: string; slug: string[] }>;
};

/** Tipos de publicación que se comparten como artículo (con fecha) */
const ARTICLE_LAYOUTS = ["devlog", "story", "inventions", "poems", "songs", "characters"];

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function toPath(slug: string[]): string {
  return "/" + slug.map(decode).join("/");
}

/**
 * Prefijos que agregaba la versión ANTIGUA de src/proxy.ts en los subdominios
 * (frases.jomerarte.com/Poesias llegaba como /Frases/Poesias). Si ese archivo viejo sigue en el
 * repositorio, se quita el prefijo para que las páginas funcionen igual y no den error 404.
 */
const LEGACY_PREFIX: Record<string, string> = { frases: "frases", cielinfier: "cielinfier" };

function resolveRequest(slug: string[], site: SiteContext, customs: CustomSection[], admin: boolean) {
  const list = admin ? customs : customs.filter((c) => c.visible);
  let path = toPath(slug);
  // Primero las páginas predeterminadas (solo sitio principal); después las creadas desde el panel
  const fixed = site.isMain ? resolvePath(path) : null;
  let customMatch = fixed ? null : resolveCustomPath(path, list);
  let legacyHome = false;
  if (!site.isMain && !customMatch && slug.length > 0 && foldText(decode(slug[0])) === LEGACY_PREFIX[site.slug]) {
    const rest = slug.slice(1);
    path = toPath(rest);
    if (rest.length === 0) legacyHome = true;
    else customMatch = resolveCustomPath(path, list);
    console.warn(
      `[subdominios] Llegó la dirección antigua “${toPath(slug)}” en ${site.slug}. Sube el archivo nuevo src/proxy.ts (o borra el viejo) en tu repositorio.`,
    );
  }
  return { r: fixed ?? customMatch, customMatch, path, legacyHome };
}

/** Título, descripción, imagen y dirección canónica de cada página (Google, redes sociales e IA). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: segment, slug } = await params;
  const site = await siteFromSlug(segment);
  const [pages, customs, d] = await Promise.all([
    cachedPageTexts(site.slug),
    cachedCustomSections(site.slug),
    cachedDefaultSeo(site.slug),
  ]);
  const { r, legacyHome } = resolveRequest(slug, site, customs, false);
  const common = { siteName: d.settings.siteName, locale: d.locale, handle: twitterHandle(d.settings.twitter) };
  if (legacyHome) return { alternates: { canonical: "/" } };
  if (!r) return { title: "Página no encontrada", robots: { index: false, follow: true } };

  if (r.kind === "detail") {
    const item = await getItem(r.id, site.slug);
    const text = pages[r.section.key];
    if (!item || item.section !== r.section.key) return { title: text?.title };
    return pageMetadata({
      ...common,
      title: item.title || text?.title,
      description: itemDescription(item) ?? text?.intro,
      path: detailPath(r.section.path, item),
      image: itemImage(d.base, item) ?? d.image,
      article: ARTICLE_LAYOUTS.includes(r.section.layout)
        ? { publishedTime: item.createdAt.toISOString(), modifiedTime: item.updatedAt.toISOString() }
        : undefined,
    });
  }
  if (r.kind === "custom-page") {
    const it = r.custom.item;
    return pageMetadata({
      ...common,
      title: it.title,
      description: it.subtitle || excerpt(it.content, 200) || undefined,
      path: r.canonical,
      image: absUrl(d.base, it.imageUrl) ?? d.image,
    });
  }
  const key = r.kind === "hub" ? r.hub.key : r.section.key;
  const t = pages[key];
  return pageMetadata({
    ...common,
    title: t?.title,
    description: t?.intro || (t?.title ? `${t.title} — ${d.settings.siteName}` : undefined),
    path: r.canonical,
    image: absUrl(d.base, t?.imageUrl) ?? d.image,
  });
}

export default async function CatchAllPage({ params }: Props) {
  const { site: segment, slug } = await params;
  const site = await siteFromSlug(segment);
  const [settings, pages, customs, menu, seo] = await Promise.all([
    cachedSettings(site.slug),
    cachedPageTexts(site.slug),
    cachedCustomSections(site.slug),
    cachedMenuModel(site.slug),
    cachedSeoContext(site.slug),
  ]);
  const admin = false;
  const { r, customMatch, path, legacyHome } = resolveRequest(slug, site, customs, admin);

  if (legacyHome) return <SubsiteHome siteSlug={site.slug} />;
  if (!r) notFound();

  if (r.kind !== "detail" && path !== r.canonical) redirect(r.canonical);

  // Pestañas y texto superior según el menú (con el orden elegido en el panel)
  const tabsFor = (key: string) => (site.isMain ? buildTabs(menu, key) : buildSubsiteTabs(key, customs, pages));
  const eyebrowFor = (key: string) =>
    !site.isMain && customMatch ? customMatch.custom.menuLabel || settings.siteName : menuEyebrow(menu, key, settings.siteName);
  const url = (p: string) => `${seo.base}${p}`;

  if (r.kind === "hub") {
    const text = pages[r.hub.key];
    if (text?.visible === false && !admin) notFound();
    const hub = { ...r.hub, icon: text?.icon ?? r.hub.icon };
    const ld = jsonLdGraph([
      breadcrumbNode(seo, [
        { href: "/", label: "Inicio" },
        { href: r.hub.path, label: text?.navLabel ?? r.hub.navLabel },
      ]),
      ...hubPageNodes(seo, {
        url: url(r.hub.path),
        name: text?.title ?? r.hub.title,
        description: text?.intro,
        image: absUrl(seo.base, text?.imageUrl),
        entries: groupEntries(menu, r.hub.group).map((e) => ({ title: e.title, path: e.path, intro: e.intro })),
      }),
    ]);
    return (
      <>
        <JsonLd data={ld} />
        <HubView hub={hub} pages={pages} settings={settings} admin={admin} menu={menu} siteSlug={site.slug} />
      </>
    );
  }

  if (r.kind === "custom-page") {
    const it = r.custom.item;
    const ld = jsonLdGraph([
      breadcrumbNode(seo, [...menuCrumbs(menu, r.custom.key), { href: r.custom.path, label: it.title }]),
      webPageNode(seo, {
        url: url(r.custom.path),
        name: it.title,
        description: excerpt(it.subtitle || it.content, 300) || undefined,
        image: absUrl(seo.base, it.imageUrl),
        dateModified: it.updatedAt.toISOString(),
      }),
    ]);
    return (
      <>
        <JsonLd data={ld} />
        <CustomPageView custom={r.custom} tabs={tabsFor(r.custom.key)} admin={admin} eyebrow={eyebrowFor(r.custom.key)} menu={menu} />
      </>
    );
  }

  // Las páginas predeterminadas usan lo cambiado en el panel: ícono, sección y orden de categorías
  const section = customMatch ? r.section : withPageText(r.section, pages[r.section.key]);
  if (pages[section.key]?.visible === false && !admin) notFound();
  const text: PageText = pages[section.key] ?? {
    key: section.key,
    navLabel: section.navLabel,
    title: section.title,
    intro: section.intro,
    imageUrl: section.image ?? "",
    visible: true,
    icon: section.icon,
    group: section.group,
    options: section.options ?? {},
  };

  if (r.kind === "detail") {
    const item = await getItem(r.id, site.slug);
    if (!item || item.section !== section.key || item.site !== site.slug || (!item.published && !admin)) notFound();
    const proper = itemPath(section.path, item);
    if (path !== proper) redirect(proper);
    const ld = jsonLdGraph([
      breadcrumbNode(seo, [
        ...menuCrumbs(menu, section.key),
        { href: section.path, label: text.navLabel },
        { href: proper, label: item.title },
      ]),
      ...detailPageNodes(seo, section, item, text.title),
    ]);
    return (
      <>
        <JsonLd data={ld} />
        <ItemDetailView
          section={section}
          item={item}
          pages={pages}
          settings={settings}
          admin={admin}
          menu={menu}
          siteSlug={site.slug}
        />
      </>
    );
  }

  const items = await cachedItems(site.slug, section.key, {});
  const ld = jsonLdGraph([
    breadcrumbNode(seo, [...menuCrumbs(menu, section.key), { href: section.path, label: text.navLabel }]),
    ...listPageNodes(seo, {
      section,
      items,
      url: url(section.path),
      name: text.title,
      description: text.intro,
      image: absUrl(seo.base, text.imageUrl),
    }),
  ]);
  return (
    <>
      <JsonLd data={ld} />
      <SectionPage
        section={section}
        text={text}
        items={items}
        settings={settings}
        tabs={tabsFor(section.key)}
        admin={admin}
        eyebrow={eyebrowFor(section.key)}
        menu={menu}
        extra={customMatch?.kind === "section" ? customMatch.custom.item : undefined}
      />
    </>
  );
}
