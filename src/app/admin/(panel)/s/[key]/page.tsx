import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutList,
  Pencil,
  Plus,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { getAnySection, getCustomSections, getItems, getPageTexts, type CustomSection } from "@/lib/data";
import { getCurrentSite } from "@/lib/site";
import { cn, excerpt, mediaThumb } from "@/lib/format";
import { getPageDef, groupLabel, type PageDef } from "@/lib/sections";
import { ConfirmButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { MediaInput } from "@/components/admin/MediaInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { itemPath } from "@/components/views/SectionView";
import { deleteItemAction, moveItemAction, savePageAction, toggleItemAction } from "../../../actions";

export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  created: "Guardado correctamente.",
  updated: "Cambios guardados.",
  page: "Textos de la página guardados.",
  pageCreated: "¡Página creada! Ya aparece en el menú. Ahora agrega su contenido con el botón “Agregar”.",
  pageUpdated: "Página guardada.",
};

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ key }, { ok }, site] = await Promise.all([params, searchParams, getCurrentSite()]);
  // Los subdominios solo tienen páginas personalizadas
  const staticDef = site.isMain || key === "custom" ? getPageDef(key) : undefined;
  const found = staticDef ? null : await getAnySection(key);
  if (!staticDef && !found) notFound();
  const def: PageDef = staticDef ?? found!.section;
  const custom = found?.custom;
  const isCustomList = key === "custom";
  const where = (c: CustomSection) => (site.isMain ? groupLabel(c.group) : c.menuLabel ? `el menú “${c.menuLabel}”` : "el menú principal");

  const [pages, customs] = await Promise.all([
    getPageTexts(),
    isCustomList ? getCustomSections() : Promise.resolve<CustomSection[]>([]),
  ]);
  const text = pages[key] ?? { key, navLabel: def.navLabel, title: def.title, intro: def.intro, imageUrl: "", visible: true };
  const section = def.hub ? null : def;
  const list = section ? await getItems(key, { all: true }) : [];
  const infoById = new Map(customs.map((c) => [c.item.id, c] as const));
  const viewHref = custom ? custom.path : isCustomList ? null : def.path;
  const addHref = isCustomList ? "/admin/s/custom/nuevo" : `/admin/s/${key}/nuevo`;
  const subtitle = isCustomList
    ? "Crea páginas nuevas, elige su tipo y en qué sección del menú aparecen"
    : custom
      ? `${custom.path} · ${custom.type.label} · en ${where(custom)}`
      : def.path;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">{text.navLabel}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent-light">
            <Icon name={custom?.icon ?? def.icon} className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold text-white uppercase">{text.navLabel}</h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewHref && (
            <Link href={viewHref} target="_blank" className="btn-ghost">
              <ExternalLink className="h-4 w-4" /> Ver página
            </Link>
          )}
          {section && (
            <Link href={addHref} className="btn-primary">
              <Plus className="h-4 w-4" /> {isCustomList ? "Crear página" : `Agregar ${section.itemLabel}`}
            </Link>
          )}
        </div>
      </div>

      {ok && OK[ok] && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{OK[ok]}</div>
      )}

      {custom && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-display text-lg font-bold tracking-wide text-white uppercase">Configuración de la página</p>
            <p className="text-sm text-zinc-400">
              Tipo: <strong className="text-zinc-200">{custom.type.label}</strong> · Ubicación:{" "}
              <strong className="text-zinc-200">{where(custom)}</strong> ·{" "}
              {custom.visible ? "Publicada" : "Oculta"}
            </p>
          </div>
          <Link href={`/admin/s/custom/${custom.item.id}`} className="btn-ghost">
            <Settings2 className="h-4 w-4" /> Editar nombre, tipo, ubicación y textos
          </Link>
        </section>
      )}

      {section && (
        <section className="card overflow-hidden">
          {list.length === 0 ? (
            <div className="p-10 text-center text-zinc-400">
              Todavía no hay {isCustomList ? "páginas" : "elementos"}.{" "}
              <Link href={addHref} className="font-semibold text-accent-light hover:underline">
                {isCustomList ? "Crea la primera" : "Agrega el primero"}
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {list.map((it, i) => {
                const info = isCustomList ? infoById.get(it.id) : undefined;
                const thumb = it.imageUrl ? mediaThumb(it.imageUrl) : null;
                const publicHref = info ? info.path : section.detail ? itemPath(section.path, it) : section.path;
                const meta = info
                  ? `${info.type.label} · en ${where(info)} · ${info.path}`
                  : [it.category, it.subtitle, it.price].filter(Boolean).join(" · ") || excerpt(it.content, 90);
                return (
                  <li key={it.id} className={cn("flex items-center gap-3 p-3 sm:p-4", !it.published && "opacity-60")}>
                    <div className="flex flex-col">
                      <form action={moveItemAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="section" value={key} />
                        <input type="hidden" name="dir" value="up" />
                        <button
                          type="submit"
                          disabled={i === 0}
                          className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                          aria-label="Subir"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </form>
                      <form action={moveItemAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="section" value={key} />
                        <input type="hidden" name="dir" value="down" />
                        <button
                          type="submit"
                          disabled={i === list.length - 1}
                          className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                          aria-label="Bajar"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="placeholder-art grid h-full w-full place-items-center">
                          <Icon name={info?.icon ?? section.icon} className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                    </div>
                    <Link href={`/admin/s/${key}/${it.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white hover:text-accent-light">
                        {it.title || excerpt(it.content, 90) || "(sin título)"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{meta}</p>
                      <div className="mt-1 flex gap-1.5">
                        {!it.published && (
                          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-200 uppercase">Oculto</span>
                        )}
                        {it.featured && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                            Destacado
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {info?.def && (
                        <Link
                          href={`/admin/s/${info.key}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-accent-light hover:bg-white/10 hover:text-white"
                          title="Administrar el contenido de esta página"
                        >
                          <LayoutList className="h-4 w-4" />
                          <span className="hidden md:inline">Contenido</span>
                        </Link>
                      )}
                      <form action={toggleItemAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="field" value="published" />
                        <button
                          type="submit"
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                          title={it.published ? "Ocultar" : "Publicar"}
                          aria-label={it.published ? "Ocultar" : "Publicar"}
                        >
                          {it.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </form>
                      {!isCustomList && (
                        <form action={toggleItemAction} className="hidden sm:block">
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="field" value="featured" />
                          <button
                            type="submit"
                            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                            title="Destacar en portada"
                            aria-label="Destacar en portada"
                          >
                            <Star className={cn("h-4 w-4", it.featured && "fill-amber-400 text-amber-400")} />
                          </button>
                        </form>
                      )}
                      <Link
                        href={publicHref}
                        target="_blank"
                        className="hidden rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white sm:block"
                        title="Ver en el sitio"
                        aria-label="Ver en el sitio"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/s/${key}/${it.id}`}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <form action={deleteItemAction}>
                        <input type="hidden" name="id" value={it.id} />
                        <ConfirmButton
                          message={
                            isCustomList
                              ? "¿Eliminar esta página y todo su contenido? No se puede deshacer."
                              : "¿Seguro que quieres eliminar este elemento? No se puede deshacer."
                          }
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {isCustomList && list.length > 0 && (
        <p className="text-sm text-zinc-500">
          El orden de esta lista es el orden en que aparecen las páginas dentro de su sección del menú.
        </p>
      )}

      {staticDef && !isCustomList && (
        <details className="card group p-6" open={!section}>
          <summary className="flex items-center justify-between">
            <span>
              <span className="block font-display text-lg font-bold tracking-wide text-white uppercase">Textos de la página</span>
              <span className="text-sm text-zinc-500">
                Nombre en el menú, título, introducción, imagen de cabecera y visibilidad
              </span>
            </span>
            <Pencil className="h-4 w-4 text-zinc-500" />
          </summary>
          <form action={savePageAction} className="mt-6 space-y-5">
            <input type="hidden" name="key" value={key} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre en el menú</label>
                <input name="navLabel" defaultValue={text.navLabel} className="input" />
              </div>
              <div>
                <label className="label">Título de la página</label>
                <input name="title" defaultValue={text.title} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Introducción</label>
              <textarea name="intro" rows={4} defaultValue={text.intro} className="input" />
            </div>
            <div>
              <label className="label">Imagen de cabecera</label>
              <MediaInput name="imageUrl" defaultValue={text.imageUrl} accept="image/*" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input type="checkbox" name="visible" defaultChecked={text.visible} className="h-4 w-4 accent-[var(--accent)]" />
              Página visible en el sitio y en el menú
            </label>
            <SubmitButton>Guardar textos</SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}
