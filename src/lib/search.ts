import { isDatabaseConfigured } from "@/db";
import { cachedAllPublished, cachedCustomSections, cachedPageTexts } from "./data";
import { excerpt, foldText, itemCategories, slugify } from "./format";
import { ALL_PAGE_DEFS, SECTIONS, type IconName, type SectionDef } from "./sections";
import type { SiteContext } from "./site";

export type SearchHit = {
  id: string;
  title: string;
  href: string;
  image: string;
  icon: IconName;
  cats: string[];
  snippet: string;
  price: string;
  score: number;
};

export type SearchGroup = { key: string; label: string; href: string; icon: IconName; hits: SearchHit[]; total: number; best: number };

export type CategoryHit = { name: string; label: string; href: string; count: number };

export type SearchResults = { groups: SearchGroup[]; categories: CategoryHit[]; total: number };

const MAX_PER_GROUP = 12;

function tokensOf(q: string): string[] {
  return foldText(q).split(/\s+/).filter(Boolean).slice(0, 8);
}

function scoreOf(tokens: string[], fields: { title: string; cats: string; sub: string; body: string }): number {
  const all = `${fields.title} ${fields.cats} ${fields.sub} ${fields.body}`;
  if (!tokens.every((t) => all.includes(t))) return 0;
  let score = 0;
  for (const t of tokens) {
    if (fields.title.includes(t)) score += fields.title.startsWith(t) ? 7 : 5;
    if (fields.cats.includes(t)) score += 3;
    if (fields.sub.includes(t)) score += 2;
    if (fields.body.includes(t)) score += 1;
  }
  return Math.max(score, 1);
}

/**
 * Busca en todo el sitio actual (el principal o el subdominio): nombre, categorías, subtítulo y descripción.
 * Solo incluye contenido publicado de páginas visibles.
 */
export async function searchSite(site: SiteContext, rawQuery: string): Promise<SearchResults> {
  const tokens = tokensOf(rawQuery);
  if (tokens.length === 0 || !isDatabaseConfigured()) return { groups: [], categories: [], total: 0 };

  const [pages, customs, rows] = await Promise.all([
    cachedPageTexts(site.slug),
    cachedCustomSections(site.slug),
    cachedAllPublished(site.slug),
  ]);
  const visibleCustoms = customs.filter((c) => c.visible);

  // Secciones visibles del sitio actual donde se puede buscar
  const sections = new Map<string, { def: SectionDef; label: string }>();
  if (site.isMain) {
    for (const s of SECTIONS) {
      if (s.layout !== "custom" && pages[s.key]?.visible !== false) {
        sections.set(s.key, { def: s, label: pages[s.key]?.navLabel || s.navLabel });
      }
    }
  }
  for (const c of visibleCustoms) {
    if (c.def) sections.set(c.key, { def: c.def, label: pages[c.key]?.navLabel || c.item.title || c.item.slug });
  }

  // 1) Páginas cuyo nombre coincide (secciones fijas y páginas creadas desde el panel)
  const pageHits: SearchHit[] = [];
  if (site.isMain) {
    for (const def of ALL_PAGE_DEFS) {
      if (def.key === "custom" || pages[def.key]?.visible === false) continue;
      const t = pages[def.key];
      const score = scoreOf(tokens, {
        title: foldText(t?.navLabel ?? def.navLabel),
        cats: "",
        sub: foldText(t?.title ?? def.title),
        body: foldText(t?.intro ?? def.intro),
      });
      if (score > 0) {
        pageHits.push({
          id: `p-${def.key}`,
          title: t?.title ?? def.title,
          href: def.path,
          image: t?.imageUrl ?? "",
          icon: def.icon,
          cats: [],
          snippet: excerpt(t?.intro ?? def.intro, 140),
          price: "",
          score: score + 2,
        });
      }
    }
  }
  for (const c of visibleCustoms) {
    const it = c.item;
    const score = scoreOf(tokens, {
      title: foldText(it.title),
      cats: "",
      sub: foldText(it.subtitle),
      body: foldText(it.content.slice(0, 5000)),
    });
    if (score > 0) {
      pageHits.push({
        id: `c-${it.id}`,
        title: it.title || it.slug,
        href: c.path,
        image: it.imageUrl,
        icon: c.icon,
        cats: [],
        snippet: excerpt(it.subtitle || it.content, 140),
        price: "",
        score: score + 2,
      });
    }
  }

  // 2) Contenido de cada sección

  const groups = new Map<string, SearchGroup>();
  const catCounts = new Map<string, CategoryHit>();
  const joined = tokens.join(" ");

  for (const it of rows) {
    const sec = sections.get(it.section);
    if (!sec) continue;
    const cats = itemCategories(it);

    for (const c of cats) {
      const fc = foldText(c);
      if (fc.includes(joined) || tokens.every((t) => fc.includes(t))) {
        const key = `${it.section}|${c}`;
        const prev = catCounts.get(key);
        if (prev) prev.count += 1;
        else catCounts.set(key, { name: c, label: sec.label, href: `${sec.def.path}?cat=${encodeURIComponent(c)}`, count: 1 });
      }
    }

    // En los trucos de juegos también se busca por el código y por “para qué sirve”
    const score = scoreOf(tokens, {
      title: foldText(it.title),
      cats: foldText(cats.join(" ")),
      sub: foldText(`${it.subtitle} ${it.location} ${it.unit} ${it.purpose} ${it.code}`),
      body: foldText(it.content.slice(0, 5000)),
    });
    if (score === 0) continue;

    const href = sec.def.detail
      ? `${sec.def.path}/${it.id}-${slugify(it.title) || "ver"}`
      : `${sec.def.path}?q=${encodeURIComponent(rawQuery.trim())}`;
    let group = groups.get(it.section);
    if (!group) {
      group = {
        key: it.section,
        label: sec.label,
        href: `${sec.def.path}?q=${encodeURIComponent(rawQuery.trim())}`,
        icon: sec.def.icon,
        hits: [],
        total: 0,
        best: 0,
      };
      groups.set(it.section, group);
    }
    group.total += 1;
    group.best = Math.max(group.best, score);
    // Un truco se muestra como “CÓDIGO · para qué sirve”, con el juego en el texto de abajo
    const isCheat = sec.def.layout === "cheats";
    group.hits.push({
      id: String(it.id),
      title: isCheat
        ? [it.code, it.purpose].filter(Boolean).join(" · ") || it.title || excerpt(it.content, 80)
        : it.title || excerpt(it.content, 80),
      href,
      image: it.imageUrl,
      icon: sec.def.icon,
      cats,
      snippet: isCheat
        ? [it.title, excerpt(it.content, 120)].filter(Boolean).join(" — ")
        : excerpt(it.subtitle || it.content, 140),
      price: it.price,
      score,
    });
  }

  const ordered = [...groups.values()]
    .map((g) => ({ ...g, hits: g.hits.sort((a, b) => b.score - a.score).slice(0, MAX_PER_GROUP) }))
    .sort((a, b) => b.best - a.best);
  if (pageHits.length > 0) {
    ordered.unshift({
      key: "__pages",
      label: "Páginas",
      href: "",
      icon: "file",
      hits: pageHits.sort((a, b) => b.score - a.score).slice(0, MAX_PER_GROUP),
      total: pageHits.length,
      best: 999,
    });
  }
  const total = ordered.reduce((n, g) => n + g.total, 0);
  const categories = [...catCounts.values()].sort((a, b) => b.count - a.count).slice(0, 24);
  return { groups: ordered, categories, total };
}
