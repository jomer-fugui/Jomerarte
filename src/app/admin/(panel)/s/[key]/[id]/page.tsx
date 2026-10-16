import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, LayoutList, Trash2 } from "lucide-react";
import { getAnySection, getItem, getPageTexts, type Item } from "@/lib/data";
import { describeCustomPage, getPageType, isGroupKey, newItemLabel } from "@/lib/sections";
import { ConfirmButton } from "@/components/client";
import { CustomPageForm, type CustomPageValues } from "@/components/admin/CustomPageForm";
import { ItemForm, type ItemValues } from "@/components/admin/ItemForm";
import { itemPath } from "@/components/views/SectionView";
import { deleteItemAction } from "../../../../actions";

export const dynamic = "force-dynamic";

function toValues(it: Item): ItemValues & { id: number } {
  return {
    id: it.id,
    title: it.title,
    subtitle: it.subtitle,
    content: it.content,
    category: it.category,
    imageUrl: it.imageUrl,
    gallery: Array.isArray(it.gallery) ? it.gallery : [],
    videoUrl: it.videoUrl,
    linkUrl: it.linkUrl,
    linkLabel: it.linkLabel,
    platform: it.platform,
    price: it.price,
    unit: it.unit,
    rating: it.rating,
    location: it.location,
    slug: it.slug,
    featured: it.featured,
    published: it.published,
  };
}

function toPageValues(it: Item): CustomPageValues & { id: number } {
  return {
    id: it.id,
    title: it.title,
    slug: it.slug,
    subtitle: it.subtitle,
    content: it.content,
    imageUrl: it.imageUrl,
    gallery: Array.isArray(it.gallery) ? it.gallery : [],
    videoUrl: it.videoUrl,
    linkUrl: it.linkUrl,
    linkLabel: it.linkLabel,
    pageType: getPageType(it.pageType || "page").key,
    menuGroup: isGroupKey(it.menuGroup) ? it.menuGroup : "mas",
    icon: it.icon,
    published: it.published,
  };
}

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; id: string }>;
  searchParams: Promise<{ grupo?: string }>;
}) {
  const [{ key, id }, sp] = await Promise.all([params, searchParams]);

  /* ───── Crear / editar una página personalizada */
  if (key === "custom") {
    let page: Item | undefined;
    if (id !== "nuevo") {
      page = await getItem(Number(id));
      if (!page || page.section !== "custom") notFound();
    }
    const info = page ? describeCustomPage(page) : null;
    const host = (process.env.NEXT_PUBLIC_SITE_URL || "https://jomerarte.com").replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const grupo = sp.grupo ?? "";

    return (
      <div className="space-y-6">
        <nav className="text-sm text-zinc-500">
          <Link href="/admin" className="hover:text-white">
            Panel
          </Link>{" "}
          /{" "}
          <Link href="/admin/s/custom" className="hover:text-white">
            Páginas personalizadas
          </Link>{" "}
          / <span className="text-zinc-300">{page ? "Editar" : "Nueva"}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-white uppercase">
            {page ? `Editar página: ${page.title}` : "Nueva página"}
          </h1>
          {info && (
            <div className="flex flex-wrap gap-2">
              {info.def && (
                <Link href={`/admin/s/${info.key}`} className="btn-ghost">
                  <LayoutList className="h-4 w-4" /> Administrar contenido
                </Link>
              )}
              <Link href={info.path} target="_blank" className="btn-ghost">
                <ExternalLink className="h-4 w-4" /> Ver página
              </Link>
            </div>
          )}
        </div>

        <CustomPageForm
          page={page ? toPageValues(page) : null}
          defaultGroup={isGroupKey(grupo) ? grupo : undefined}
          host={host}
        />

        {page && (
          <form action={deleteItemAction} className="border-t border-white/10 pt-6">
            <input type="hidden" name="id" value={page.id} />
            <input type="hidden" name="redirectTo" value="/admin/s/custom" />
            <ConfirmButton message="¿Eliminar esta página y todo su contenido? No se puede deshacer." className="btn-danger">
              <Trash2 className="h-4 w-4" /> Eliminar página
            </ConfirmButton>
          </form>
        )}
      </div>
    );
  }

  /* ───── Elemento de una sección (fija o de una página nueva) */
  const found = await getAnySection(key);
  if (!found) notFound();
  const section = found.section;
  let item: Item | undefined;
  if (id !== "nuevo") {
    item = await getItem(Number(id));
    if (!item || item.section !== key) notFound();
  }
  const pages = await getPageTexts();
  const label = pages[key]?.navLabel ?? section.navLabel;
  const publicHref = item ? (section.detail ? itemPath(section.path, item) : section.path) : null;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        /{" "}
        <Link href={`/admin/s/${key}`} className="hover:text-white">
          {label}
        </Link>{" "}
        / <span className="text-zinc-300">{item ? "Editar" : "Nuevo"}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white uppercase">
          {item ? `Editar ${section.itemLabel}` : newItemLabel(section)}
        </h1>
        {publicHref && (
          <Link href={publicHref} target="_blank" className="btn-ghost">
            <ExternalLink className="h-4 w-4" /> Ver en el sitio
          </Link>
        )}
      </div>

      <ItemForm
        section={{
          key: section.key,
          fields: section.fields,
          categories: section.categories,
          itemLabel: section.itemLabel,
          layout: section.layout,
        }}
        item={item ? toValues(item) : null}
      />

      {item && (
        <form action={deleteItemAction} className="border-t border-white/10 pt-6">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="redirectTo" value={`/admin/s/${key}`} />
          <ConfirmButton message="¿Seguro que quieres eliminar este elemento? No se puede deshacer." className="btn-danger">
            <Trash2 className="h-4 w-4" /> Eliminar {section.itemLabel}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
