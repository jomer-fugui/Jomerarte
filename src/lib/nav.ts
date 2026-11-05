import { GROUPS, HUBS, SECTIONS, type GroupKey, type HubDef, type IconName, type SectionDef } from "./sections";
import type { CustomSection, PageText } from "./data";

export type NavLink = { href: string; label: string; icon: IconName };
export type NavGroup = {
  key: string;
  label: string;
  href?: string;
  icon: IconName;
  links: NavLink[];
  /** Enlace directo en el menú (sin desplegable) */
  direct?: boolean;
};
export type Tab = { key: string; href: string; label: string };
export type Crumb = { href: string; label: string };

/** Orden y nombres del menú del sitio principal (se guarda en los ajustes, clave "__menu"). */
export type MenuConfig = {
  /** Orden de las secciones del menú */
  groups?: string[];
  /** Nombres de las secciones que no tienen página principal (Frases, CielInfier, Más) */
  labels?: Record<string, string>;
  /** Orden de las páginas de cada sección: claves de páginas predeterminadas y nuevas ("c12") */
  order?: Record<string, string[]>;
};

/** Una página dentro de una sección del menú (predeterminada o creada desde el panel). */
export type MenuEntry = {
  key: string;
  kind: "fixed" | "custom";
  path: string;
  navLabel: string;
  title: string;
  intro: string;
  image: string;
  icon: IconName;
  visible: boolean;
  group: GroupKey;
  /** Lista de la página (null = página libre) */
  def: SectionDef | null;
  custom?: CustomSection;
};

export type MenuGroup = {
  key: GroupKey;
  label: string;
  defaultLabel: string;
  icon: IconName;
  /** Página principal de la sección (Servicios, Tienda…), si tiene */
  hub: HubDef | null;
  hubVisible: boolean;
  /** Páginas en el orden elegido (incluye las ocultas) */
  entries: MenuEntry[];
};

export type MenuModel = { groups: MenuGroup[] };

const GROUP_KEYS = GROUPS.map((g) => g.key);

function isGroup(v: unknown): v is GroupKey {
  return typeof v === "string" && (GROUP_KEYS as string[]).includes(v);
}

function cleanList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim().slice(0, 64);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/** Valida lo guardado en los ajustes (nunca se usa el JSON tal cual). */
export function cleanMenuConfig(raw: unknown): MenuConfig {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: MenuConfig = {};
  const groups = cleanList(o.groups, 20).filter(isGroup);
  if (groups.length) out.groups = groups;
  if (o.labels && typeof o.labels === "object" && !Array.isArray(o.labels)) {
    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.labels as Record<string, unknown>)) {
      if (isGroup(k) && typeof v === "string" && v.trim()) labels[k] = v.replace(/\s+/g, " ").trim().slice(0, 60);
    }
    if (Object.keys(labels).length) out.labels = labels;
  }
  if (o.order && typeof o.order === "object" && !Array.isArray(o.order)) {
    const order: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(o.order as Record<string, unknown>)) {
      if (!isGroup(k)) continue;
      const list = cleanList(v, 300);
      if (list.length) order[k] = list;
    }
    if (Object.keys(order).length) out.order = order;
  }
  return out;
}

/** Orden de las secciones del menú (las que falten se agregan al final, en su orden original). */
export function orderedGroupKeys(config: MenuConfig): GroupKey[] {
  const out: GroupKey[] = [];
  for (const k of config.groups ?? []) if (isGroup(k) && !out.includes(k)) out.push(k);
  for (const k of GROUP_KEYS) if (!out.includes(k)) out.push(k);
  return out;
}

/** Aplica a una página predeterminada lo que se cambió desde el panel (ícono, sección y categorías). */
export function withPageText<T extends SectionDef>(def: T, text?: PageText): T {
  if (!text) return def;
  return { ...def, icon: text.icon, group: text.group, options: text.options } as T;
}

function fixedEntry(s: SectionDef, pages: Record<string, PageText>): MenuEntry {
  const t = pages[s.key];
  return {
    key: s.key,
    kind: "fixed",
    path: s.path,
    navLabel: t?.navLabel || s.navLabel,
    title: t?.title || s.title,
    intro: t?.intro ?? s.intro,
    image: t?.imageUrl ?? s.image ?? "",
    icon: t?.icon ?? s.icon,
    visible: t?.visible !== false,
    group: t?.group ?? s.group,
    def: withPageText(s, t),
  };
}

function customLabel(c: CustomSection, pages: Record<string, PageText>): string {
  return pages[c.key]?.navLabel || c.item.title || c.item.slug;
}

function customEntry(c: CustomSection, pages: Record<string, PageText>): MenuEntry {
  const name = customLabel(c, pages);
  return {
    key: c.key,
    kind: "custom",
    path: c.path,
    navLabel: name,
    title: c.item.title || name,
    intro: c.item.subtitle,
    image: c.item.imageUrl,
    icon: c.icon,
    visible: c.visible,
    group: c.group,
    def: c.def,
    custom: c,
  };
}

/**
 * Estructura completa del menú: secciones en orden y, dentro de cada una, sus páginas
 * (predeterminadas y nuevas mezcladas) en el orden elegido en el panel.
 */
export function buildMenuModel(
  pages: Record<string, PageText>,
  customs: CustomSection[],
  config: MenuConfig,
  mainSite = true,
): MenuModel {
  if (!mainSite) {
    // Subdominio: el menú son sus páginas, en el orden de la lista
    return {
      groups: [
        {
          key: "mas",
          label: "",
          defaultLabel: "",
          icon: "sparkles",
          hub: null,
          hubVisible: false,
          entries: customs.map((c) => customEntry(c, pages)),
        },
      ],
    };
  }
  const groups = orderedGroupKeys(config).map((g): MenuGroup => {
    const meta = GROUPS.find((x) => x.key === g) ?? GROUPS[GROUPS.length - 1];
    const hub = HUBS.find((h) => h.group === g) ?? null;
    const all = [
      ...SECTIONS.filter((s) => s.layout !== "custom" && (pages[s.key]?.group ?? s.group) === g).map((s) => fixedEntry(s, pages)),
      ...customs.filter((c) => c.group === g).map((c) => customEntry(c, pages)),
    ];
    // Las páginas que no están en el orden guardado (nuevas o recién movidas) van al final
    const saved = config.order?.[g] ?? [];
    const rank = new Map(saved.map((k, i) => [k, i] as const));
    const entries = all
      .map((e, i) => ({ e, r: rank.get(e.key) ?? saved.length + i }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.e);
    return {
      key: g,
      label: (hub ? pages[hub.key]?.navLabel : config.labels?.[g]) || meta.label,
      defaultLabel: hub ? hub.navLabel : meta.label,
      icon: meta.icon,
      hub,
      hubVisible: hub ? pages[hub.key]?.visible !== false : false,
      entries,
    };
  });
  return { groups };
}

/** Menú principal (solo lo visible), en el orden elegido. */
export function buildNav(model: MenuModel, pages: Record<string, PageText>): NavGroup[] {
  const out: NavGroup[] = [];
  for (const g of model.groups) {
    const links: NavLink[] = [];
    if (g.hub && g.hubVisible) {
      links.push({ href: g.hub.path, label: g.hub.allLabel, icon: pages[g.hub.key]?.icon ?? g.hub.icon });
    }
    for (const e of g.entries) if (e.visible) links.push({ href: e.path, label: e.navLabel, icon: e.icon });
    if (links.length === 0) continue;
    out.push({
      key: g.key,
      label: g.label,
      href: g.hub && g.hubVisible ? g.hub.path : undefined,
      icon: g.icon,
      links,
    });
  }
  return out;
}

export function findMenuGroup(model: MenuModel, key: string): MenuGroup | null {
  return model.groups.find((g) => g.hub?.key === key || g.entries.some((e) => e.key === key)) ?? null;
}

/** En “Más” solo las dos listas de precios forman pestañas entre sí (como siempre). */
const MAS_TABS = ["precios-servicios", "precios-productos"];

/** Pestañas de una página: las páginas de su misma sección, en el orden del menú. */
export function buildTabs(model: MenuModel, key: string): Tab[] {
  const g = findMenuGroup(model, key);
  if (!g) return [];
  const tabs: Tab[] = g.entries
    .filter((e) => e.visible || e.key === key)
    .map((e) => ({ key: e.key, href: e.path, label: e.navLabel }));
  if (g.hub) {
    const hubTab = g.hubVisible || g.hub.key === key ? [{ key: g.hub.key, href: g.hub.path, label: g.hub.allLabel }] : [];
    return [...hubTab, ...tabs];
  }
  if (g.key !== "mas") return tabs;
  return MAS_TABS.includes(key) ? tabs.filter((t) => MAS_TABS.includes(t.key)) : [];
}

/** Migas de pan: Inicio › página principal de la sección (o la primera de la sección). */
export function menuCrumbs(model: MenuModel | undefined, key: string): Crumb[] {
  const crumbs: Crumb[] = [{ href: "/", label: "Inicio" }];
  const g = model ? findMenuGroup(model, key) : null;
  if (!model || !g) return crumbs;
  if (g.hub) {
    if (g.hub.key !== key) crumbs.push({ href: g.hub.path, label: g.label });
    return crumbs;
  }
  const lead = buildTabs(model, key)[0];
  if (lead && lead.key !== key) crumbs.push({ href: lead.href, label: lead.label });
  return crumbs;
}

/** Texto pequeño sobre el título de una página: el nombre de su sección del menú. */
export function menuEyebrow(model: MenuModel | undefined, key: string, fallback: string): string {
  const g = model ? findMenuGroup(model, key) : null;
  if (!g || g.key === "mas") return fallback;
  return g.label;
}

/** Páginas visibles de una sección del menú (predeterminadas y nuevas), en orden. */
export function groupEntries(model: MenuModel, group: GroupKey): MenuEntry[] {
  return model.groups.find((g) => g.key === group)?.entries.filter((e) => e.visible) ?? [];
}

/** Menú de un subdominio: páginas sueltas como enlaces directos y las que comparten “sección” en un desplegable. */
export function buildSubsiteNav(customs: CustomSection[], pages: Record<string, PageText>): NavGroup[] {
  const out: NavGroup[] = [];
  const groups = new Map<string, NavGroup>();
  for (const c of customs) {
    if (!c.visible) continue;
    const label = customLabel(c, pages);
    const link: NavLink = { href: c.path, label, icon: c.icon };
    if (!c.menuLabel) {
      out.push({ key: c.key, label, href: c.path, icon: c.icon, links: [link], direct: true });
      continue;
    }
    const gk = c.menuLabel.toLowerCase();
    let group = groups.get(gk);
    if (!group) {
      group = { key: `g:${gk}`, label: c.menuLabel, icon: c.icon, links: [] };
      groups.set(gk, group);
      out.push(group);
    }
    group.links.push(link);
  }
  return out;
}

/** Pestañas de una página de subdominio: las páginas de su misma sección del menú. */
export function buildSubsiteTabs(key: string, customs: CustomSection[], pages: Record<string, PageText>): Tab[] {
  const me = customs.find((c) => c.key === key);
  if (!me) return [];
  const label = me.menuLabel.toLowerCase();
  const siblings = customs.filter((c) => (c.visible || c.key === key) && c.menuLabel.toLowerCase() === label);
  if (siblings.length < 2 || siblings.length > 10) return [];
  return siblings.map((c) => ({ key: c.key, href: c.path, label: customLabel(c, pages) }));
}
