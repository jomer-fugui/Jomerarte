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
} from "@/lib/data";
import { excerpt } from "@/lib/format";
import { buildTabs } from "@/lib/nav";
import { resolvePath } from "@/lib/sections";
import { CustomPageView, HubView, ItemDetailView, SectionPage, itemPath } from "@/components/views/PageViews";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toPath(slug: string[]): string {
  return (
    "/" +
    slug
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      })
      .join("/")
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = toPath(slug);
  const [pages, customs] = await Promise.all([getPageTexts(), getCustomSections()]);
  const r = resolvePath(path) ?? resolveCustomPath(path, customs);
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
  const path = toPath(slug);
  const [settings, pages, admin, customs] = await Promise.all([
    getSettings(),
    getPageTexts(),
    isAdmin(),
    getCustomSections(),
  ]);
  const visibleCustoms = customs.filter((c) => c.visible);
  // Primero las páginas fijas del sitio; después las creadas desde el panel (ocultas solo para el administrador)
  const fixed = resolvePath(path);
  const customMatch = fixed ? null : resolveCustomPath(path, admin ? customs : visibleCustoms);
  const r = fixed ?? customMatch;
  if (!r) notFound();

  if (r.kind !== "detail" && path !== r.canonical) redirect(r.canonical);

  if (r.kind === "hub") {
    if (pages[r.hub.key]?.visible === false && !admin) notFound();
    return <HubView hub={r.hub} pages={pages} settings={settings} admin={admin} customs={visibleCustoms} />;
  }

  if (r.kind === "custom-page") {
    const tabs = buildTabs(r.custom.key, r.custom.group, pages, visibleCustoms);
    return <CustomPageView custom={r.custom} pages={pages} tabs={tabs} admin={admin} />;
  }

  const section = r.section;
  if (pages[section.key]?.visible === false && !admin) notFound();

  if (r.kind === "detail") {
    const item = await getItem(r.id);
    if (!item || item.section !== section.key || (!item.published && !admin)) notFound();
    const proper = itemPath(section.path, item);
    if (path !== proper) redirect(proper);
    return <ItemDetailView section={section} item={item} pages={pages} settings={settings} admin={admin} />;
  }

  const category = typeof sp.cat === "string" ? sp.cat : undefined;
  const items = await getItems(section.key);
  const tabs = buildTabs(section.key, section.group, pages, visibleCustoms);
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
      tabs={tabs}
      admin={admin}
      category={category}
      extra={customMatch?.kind === "section" ? customMatch.custom.item : undefined}
    />
  );
}
