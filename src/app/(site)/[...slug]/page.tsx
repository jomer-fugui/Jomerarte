import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  getCustomSections,
  getItem,
  getItems,
  getPageTexts,
  getSettings,
  resolveCustomPath,
  type CustomSection,
} from "@/lib/data";
import { excerpt, foldText } from "@/lib/format";
import { buildSubsiteTabs, buildTabs } from "@/lib/nav";
import { resolvePath, type GroupKey } from "@/lib/sections";
import { getCurrentSite, type SiteContext } from "@/lib/site";
import { CustomPageView, HubView, ItemDetailView, SectionPage, itemPath } from "@/components/views/PageViews";
import { SubsiteHome } from "@/components/views/SubsiteHome";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
  // Primero las páginas fijas (solo sitio principal); después las creadas desde el panel
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, pages, customs, admin] = await Promise.all([getCurrentSite(), getPageTexts(), getCustomSections(), isAdmin()]);
  const { r, legacyHome } = resolveRequest(slug, site, customs, admin);
  if (legacyHome) return {};
  if (!r) return { title: "Página no encontrada" };

  if (r.kind === "detail") {
    const item = await getItem(r.id);
    if (item) {
      return {
        title: item.title || pages[r.section.key]?.title,
        description: excerpt(item.subtitle || item.content, 160),
        openGraph: item.imageUrl ? { images: [item.imageUrl] } : undefined,
      };
    }
    return { title: pages[r.section.key]?.title };
  }
  if (r.kind === "custom-page") {
    const it = r.custom.item;
    return {
      title: it.title,
      description: excerpt(it.subtitle || it.content, 160),
      openGraph: it.imageUrl ? { images: [it.imageUrl] } : undefined,
    };
  }
  const key = r.kind === "hub" ? r.hub.key : r.section.key;
  const t = pages[key];
  return {
    title: t?.title,
    description: excerpt(t?.intro ?? "", 160),
    openGraph: t?.imageUrl ? { images: [t.imageUrl] } : undefined,
  };
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [site, settings, pages, admin, customs] = await Promise.all([
    getCurrentSite(),
    getSettings(),
    getPageTexts(),
    isAdmin(),
    getCustomSections(),
  ]);
  const category = typeof sp.cat === "string" ? sp.cat : undefined;
  const query = typeof sp.q === "string" ? sp.q : undefined;
  const visibleCustoms = customs.filter((c) => c.visible);
  const { r, customMatch, path, legacyHome } = resolveRequest(slug, site, customs, admin);

  if (legacyHome) return <SubsiteHome category={category} query={query} />;
  if (!r) notFound();

  if (r.kind !== "detail" && path !== r.canonical) redirect(r.canonical);

  const tabsFor = (key: string, group: GroupKey) =>
    site.isMain ? buildTabs(key, group, pages, visibleCustoms) : buildSubsiteTabs(key, customs, pages);
  const eyebrow = !site.isMain && customMatch ? customMatch.custom.menuLabel || settings.siteName : undefined;

  if (r.kind === "hub") {
    if (pages[r.hub.key]?.visible === false && !admin) notFound();
    return <HubView hub={r.hub} pages={pages} settings={settings} admin={admin} customs={visibleCustoms} />;
  }

  if (r.kind === "custom-page") {
    return (
      <CustomPageView
        custom={r.custom}
        pages={pages}
        tabs={tabsFor(r.custom.key, r.custom.group)}
        admin={admin}
        eyebrow={eyebrow}
      />
    );
  }

  const section = r.section;
  if (pages[section.key]?.visible === false && !admin) notFound();

  if (r.kind === "detail") {
    const item = await getItem(r.id);
    if (!item || item.section !== section.key || item.site !== site.slug || (!item.published && !admin)) notFound();
    const proper = itemPath(section.path, item);
    if (path !== proper) redirect(proper);
    return <ItemDetailView section={section} item={item} pages={pages} settings={settings} admin={admin} />;
  }

  const items = await getItems(section.key);
  const text = pages[section.key] ?? {
    key: section.key,
    navLabel: section.navLabel,
    title: section.title,
    intro: section.intro,
    imageUrl: section.image ?? "",
    visible: true,
  };
  return (
    <SectionPage
      section={section}
      text={text}
      items={items}
      settings={settings}
      pages={pages}
      tabs={tabsFor(section.key, section.group)}
      admin={admin}
      category={category}
      query={query}
      eyebrow={eyebrow}
      extra={customMatch?.kind === "section" ? customMatch.custom.item : undefined}
    />
  );
}
