import {
  GROUPS,
  HUBS,
  SECTIONS,
  getPageDef,
  groupTabKeys,
  subnavFor,
  type GroupKey,
  type IconName,
  type SectionDef,
} from "./sections";
import type { CustomSection, PageText } from "./data";

export type NavLink = { href: string; label: string; icon: IconName };
export type NavGroup = { key: string; label: string; href?: string; icon: IconName; links: NavLink[] };
export type Tab = { key: string; href: string; label: string };

/** Una página dentro de una sección del menú (fija o creada desde el panel). */
export type Entry = {
  key: string;
  path: string;
  navLabel: string;
  title: string;
  intro: string;
  image: string;
  icon: IconName;
  def: SectionDef | null;
};

function customLabel(c: CustomSection, pages: Record<string, PageText>): string {
  return pages[c.key]?.navLabel || c.item.title || c.item.slug;
}

/** Menú principal: cada sección con sus páginas fijas y las páginas nuevas que ubicaste ahí. */
export function buildNav(pages: Record<string, PageText>, customs: CustomSection[]): NavGroup[] {
  const out: NavGroup[] = [];
  for (const g of GROUPS) {
    const hub = HUBS.find((h) => h.group === g.key);
    const hubVisible = hub ? pages[hub.key]?.visible !== false : false;
    const links: NavLink[] = [];
    if (hub && hubVisible) links.push({ href: hub.path, label: hub.allLabel, icon: hub.icon });
    for (const s of SECTIONS) {
      if (s.group !== g.key || s.layout === "custom") continue;
      const t = pages[s.key];
      if (t && !t.visible) continue;
      links.push({ href: s.path, label: t?.navLabel || s.navLabel, icon: s.icon });
    }
    for (const c of customs) {
      if (c.group !== g.key || !c.visible) continue;
      links.push({ href: c.path, label: customLabel(c, pages), icon: c.icon });
    }
    if (links.length === 0) continue;
    out.push({
      key: g.key,
      label: hub ? pages[hub.key]?.navLabel || g.label : g.label,
      href: hub && hubVisible ? hub.path : undefined,
      icon: g.icon,
      links,
    });
  }
  return out;
}

/** Pestañas de navegación de una página (sus “hermanas” dentro de la misma sección). */
export function buildTabs(
  key: string,
  group: GroupKey,
  pages: Record<string, PageText>,
  customs: CustomSection[],
): Tab[] {
  const groupKeys = groupTabKeys(group);
  const base = subnavFor(key) ?? groupKeys ?? [];
  const tabs: Tab[] = [];
  for (const k of base) {
    const def = getPageDef(k);
    if (!def || pages[k]?.visible === false) continue;
    tabs.push({ key: k, href: def.path, label: def.hub ? def.allLabel : pages[k]?.navLabel || def.navLabel });
  }
  if (groupKeys) {
    for (const c of customs) {
      if (c.group !== group || (!c.visible && c.key !== key)) continue;
      tabs.push({ key: c.key, href: c.path, label: customLabel(c, pages) });
    }
  }
  return tabs;
}

/** Páginas visibles de una sección del menú (fijas + creadas desde el panel). */
export function groupEntries(group: GroupKey, pages: Record<string, PageText>, customs: CustomSection[]): Entry[] {
  const out: Entry[] = [];
  for (const s of SECTIONS) {
    if (s.group !== group || s.layout === "custom" || pages[s.key]?.visible === false) continue;
    const t = pages[s.key];
    out.push({
      key: s.key,
      path: s.path,
      navLabel: t?.navLabel ?? s.navLabel,
      title: t?.title ?? s.title,
      intro: t?.intro ?? s.intro,
      image: t?.imageUrl ?? s.image ?? "",
      icon: s.icon,
      def: s,
    });
  }
  for (const c of customs) {
    if (c.group !== group || !c.visible) continue;
    const t = pages[c.key];
    out.push({
      key: c.key,
      path: c.path,
      navLabel: customLabel(c, pages),
      title: t?.title ?? c.item.title,
      intro: c.item.subtitle,
      image: c.item.imageUrl,
      icon: c.icon,
      def: c.def,
    });
  }
  return out;
}
