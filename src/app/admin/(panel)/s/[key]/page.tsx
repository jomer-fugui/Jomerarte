import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutList,
  ListOrdered,
  Pencil,
  Plus,
  Settings2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { getAnySection, getCustomSections, getItems, getMenuModel, getPageTexts, type CustomSection } from "@/lib/data";
import { cn, excerpt, itemCategories, mediaThumb } from "@/lib/format";
import { findMenuGroup } from "@/lib/nav";
import { getPageDef, groupLabel, type PageDef } from "@/lib/sections";
import { getCurrentSite } from "@/lib/site";
import { countUnreadFeedback } from "@/lib/feedback";
import { ConfirmButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { CategorySettings } from "@/components/admin/CategorySettings";
import { itemPath } from "@/components/views/SectionView";
import { deleteItemAction, moveItemAction, toggleItemAction } from "../../../actions";

export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  created: "Guardado correctamente.",
  updated: "Cambios guardados.",
  page: "Textos de la página guardados.",
  pageCreated: "¡Página creada! Ya aparece en el menú. Ahora agrega su contenido con el botón “Agregar”.",
  pageUpdated: "Página guardada.",
  formCreated: "¡Formulario creado! Ya aparece en el menú. Revisá los campos con “Editar el formulario” y las respuestas van a llegar acá abajo.",
  trucos: "Trucos importados. Ya se ven en la página.",
  categorias: "Orden y estilo de las categorías guardados.",
};

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ ok?: string; n?: string; skip?: string; what?: string }>;
}) {
  const [{ key }, { ok, n, skip, what }, site] = await Promise.all([params, searchParams, getCurrentSite()]);
  // Los subdominios solo tienen páginas personalizadas
  const staticDef = site.isMain || key === "custom" ? getPageDef(key) : undefined;
  // Las páginas principales (Servicios, Tienda…) no tienen lista propia: se editan en su pantalla
  if (staticDef?.hub) redirect(`/admin/pagina/${key}`);
  const found = staticDef ? null : await getAnySection(key);
  if (!staticDef && !found) notFound();
  const def: PageDef = staticDef ?? found!.section;
  const custom = found?.custom;
  const isCustomList = key === "custom";

  const [pages, customs, menu, unread] = await Promise.all([
    getPageTexts(),
    isCustomList ? getCustomSections() : Promise.resolve<CustomSection[]>([]),
    getMenuModel(),
    countUnreadFeedback(site.slug),
  ]);
  const text = pages[key];
  const navLabel = text?.navLabel ?? def.navLabel;
  const section = def.hub ? null : def;
  const list = section ? await getItems(key, { all: true }) : [];
  const infoById = new Map(customs.map((c) => [c.item.id, c] as const));
  const labelOf = (g: string) => menu.groups.find((x) => x.key === g)?.label ?? groupLabel(g);
  const where = (c: CustomSection) =>
    site.isMain ? labelOf(c.group) : c.menuLabel ? `el menú “${c.menuLabel}”` : "el menú principal";
  const viewHref = custom ? custom.path : isCustomList ? null : def.path;
  const addHref = isCustomList ? "/admin/s/custom/nuevo" : `/admin/s/${key}/nuevo`;
  const subtitle = isCustomList
    ? "Crea páginas nuevas, elige su tipo y en qué sección del menú aparecen"
    : custom
      ? `${custom.path} · ${custom.type.label} · en ${where(custom)}`
      : def.path;
  const isFixed = Boolean(staticDef) && !isCustomList;
  /** La página de opiniones no tiene publicaciones: se arma con Google y los comentarios privados */
  const isReviews = section?.layout === "reviews";
  /** Página de tipo “Formulario”: no tiene lista, se configura en el editor de la página */
  const isForm = section?.layout === "form";
  const fixedGroup = isFixed ? findMenuGroup(menu, key) : null;
  // En el sitio principal, el orden de las páginas nuevas se cambia en “Menú y orden” (junto con las predeterminadas)
  const canReorder = !(isCustomList && site.isMain);
  // Categorías de la página: orden y estilo para los visitantes
  const catCapable = Boolean(section && !isCustomList && section.fields.category && section.layout !== "prices");
  const catCounts = new Map<string, number>();
  for (const it of list) for (const c of itemCategories(it)) catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  const catList = [...catCounts.entries()].map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">{navLabel}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent-light">
            <Icon name={custom?.icon ?? text?.icon ?? def.icon} className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold text-white uppercase">{navLabel}</h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewHref && (
            <Link href={viewHref} target="_blank" className="btn-ghost">
              <ExternalLink className="h-4 w-4" /> Ver página
            </Link>
          )}
          {(section?.layout === "cheats" || section?.layout === "files") && (
            <Link href={`/admin/s/${key}/importar`} className="btn-ghost">
              <Upload className="h-4 w-4" /> {section.layout === "cheats" ? "Importar trucos" : "Importar archivos"}
            </Link>
          )}
          {section && !isReviews && !isForm && (
            <Link href={addHref} className="btn-primary">
              <Plus className="h-4 w-4" /> {isCustomList ? "Crear página" : `Agregar ${section.itemLabel}`}
            </Link>
          )}
        </div>
      </div>

      {ok === "lista" && Number(n) > 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Se agregaron {Number(n)} {what === "archivo" ? "archivos" : `truco${Number(n) === 1 ? "" : "s"}`}.
          {Number(skip) > 0 && ` Se saltearon ${Number(skip)} que ya estaban cargados en la misma lista.`}
        </div>
      )}
      {ok && OK[ok] && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{OK[ok]}</div>
      )}

      {isFixed && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold tracking-wide text-white uppercase">Configuración de la página</p>
            <p className="text-sm text-zinc-400">
              Nombre en el menú: <strong className="text-zinc-200">{navLabel}</strong> · Sección:{" "}
              <strong className="text-zinc-200">{fixedGroup?.label ?? "—"}</strong> ·{" "}
              {text?.visible === false ? "Oculta" : "Visible"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/pagina/${key}`} className="btn-ghost">
              <Settings2 className="h-4 w-4" /> Editar nombre, textos, imagen, ícono y ubicación
            </Link>
            <Link href="/admin/menu" className="btn-ghost">
              <ListOrdered className="h-4 w-4" /> Ordenar en el menú
            </Link>
          </div>
        </section>
      )}

      {custom && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-display text-lg font-bold tracking-wide text-white uppercase">Configuración de la página</p>
            <p className="text-sm text-zinc-400">
              Tipo: <strong className="text-zinc-200">{custom.type.label}</strong> · Ubicación:{" "}
              <strong className="text-zinc-200">{where(custom)}</strong> · {custom.visible ? "Publicada" : "Oculta"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/s/custom/${custom.item.id}`} className="btn-ghost">
              <Settings2 className="h-4 w-4" /> Editar nombre, tipo, ubicación y textos
            </Link>
            <Link href="/admin/menu" className="btn-ghost">
              <ListOrdered className="h-4 w-4" /> Ordenar en el menú
            </Link>
          </div>
        </section>
      )}

      {isReviews && (
        <section className="card space-y-4 p-5">
          <div>
            <p className="font-display text-lg font-bold tracking-wide text-white uppercase">Cómo funciona esta página</p>
            <p className="mt-1 text-sm text-zinc-400">
              No se carga a mano: invita a tus clientes a dejar la reseña en tu ficha de Google (con botón y código QR para
              imprimir) y muestra tus reseñas de Google si cargaste la clave. Además, quien no tiene cuenta de Google puede
              dejarte un comentario privado, que aparece acá abajo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/admin/opiniones" className="card card-hover flex items-center gap-3 p-4 text-sm text-zinc-300">
              <Star className="h-5 w-5 shrink-0 text-accent-light" />
              <span>
                <strong className="block text-white">Comentarios recibidos</strong>
                {unread > 0 ? `${unread} sin leer` : "Leer lo que dejaron los clientes"}
              </span>
            </Link>
            <Link href="/admin/ajustes#opiniones" className="card card-hover flex items-center gap-3 p-4 text-sm text-zinc-300">
              <Settings2 className="h-5 w-5 shrink-0 text-accent-light" />
              <span>
                <strong className="block text-white">Enlace de reseñas y Google</strong>
                Pegar el enlace de “Pedir reseñas” y, si querés, el Place ID
              </span>
            </Link>
          </div>
        </section>
      )}

      {isForm && custom && (
        <section className="card space-y-4 p-5">
          <div>
            <p className="font-display text-lg font-bold tracking-wide text-white uppercase">Cómo funciona este formulario</p>
            <p className="mt-1 text-sm text-zinc-400">
              Los campos se editan en la configuración de la página. Todo lo que completen los visitantes llega a
              Formularios y queda solo para vos: no se publica en el sitio.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/admin/s/custom/${custom.item.id}`} className="card card-hover flex items-center gap-3 p-4 text-sm text-zinc-300">
              <Settings2 className="h-5 w-5 shrink-0 text-accent-light" />
              <span>
                <strong className="block text-white">Editar el formulario</strong>
                Campos, campos obligatorios, desplegable de servicios y mensajes
              </span>
            </Link>
            <Link
              href={`/admin/formularios?f=${custom.key}`}
              className="card card-hover flex items-center gap-3 p-4 text-sm text-zinc-300"
            >
              <ClipboardList className="h-5 w-5 shrink-0 text-accent-light" />
              <span>
                <strong className="block text-white">Ver las respuestas</strong>
                Todo lo que enviaron los visitantes
              </span>
            </Link>
          </div>
        </section>
      )}

      {section?.layout === "products" && (
        <Link href="/admin/mercadolibre" className="card card-hover flex flex-wrap items-center gap-3 p-4 text-sm text-zinc-300">
          <span className="rounded bg-[#FFE600] px-1.5 py-0.5 text-[10px] font-extrabold text-[#2D3277]">ML</span>
          <span className="min-w-0 flex-1">
            ¿Usas links de afiliado de Mercado Libre? Activa los <strong className="text-white">precios automáticos</strong>: se
            actualizan solos sin tocar tu link.
          </span>
          <span className="font-semibold text-accent-light">Configurar →</span>
        </Link>
      )}

      {catCapable && (
        <CategorySettings sectionKey={key} site={site.slug} categories={catList} options={text?.options ?? {}} />
      )}

      {section && !isReviews && !isForm && (
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
                const isCheat = section.layout === "cheats";
                const isFile = section.layout === "files";
                const meta = info
                  ? `${info.type.label} · en ${where(info)} · ${info.path}`
                  : isCheat
                    ? [it.code && `Código: ${it.code}`, it.purpose, itemCategories(it).join(", ")].filter(Boolean).join(" · ")
                    : isFile
                      ? [it.content, itemCategories(it).join(", ")].filter(Boolean).join(" · ")
                      : [itemCategories(it).join(", "), it.subtitle, it.price].filter(Boolean).join(" · ") ||
                        excerpt(it.content, 90);
                return (
                  <li key={it.id} className={cn("flex items-center gap-3 p-3 sm:p-4", !it.published && "opacity-60")}>
                    {canReorder && (
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
                    )}
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
                        {isCheat
                          ? `${it.title || "(sin juego)"} — ${it.code || "sin código"}`
                          : isFile
                            ? `${it.title || "(sin lista)"} — ${it.subtitle || "sin nombre"}`
                            : it.title || excerpt(it.content, 90) || "(sin título)"}
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
          {site.isMain ? (
            <>
              Para cambiar el orden en que aparecen en el menú (junto con las páginas predeterminadas) usa{" "}
              <Link href="/admin/menu" className="font-semibold text-accent-light hover:underline">
                Menú y orden
              </Link>
              .
            </>
          ) : (
            "El orden de esta lista es el orden en que aparecen las páginas en el menú."
          )}
        </p>
      )}
    </div>
  );
}
