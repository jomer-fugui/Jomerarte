import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, LayoutList, ListOrdered } from "lucide-react";
import { getMenuModel, getPageTexts } from "@/lib/data";
import { siteLabel } from "@/lib/hosts";
import { getPageDef } from "@/lib/sections";
import { getCurrentSite } from "@/lib/site";
import { FixedPageForm } from "@/components/admin/FixedPageForm";

export const dynamic = "force-dynamic";

/** Edición de una página predeterminada (Servicios, Electricista, Frases, Inventos…). */
export default async function FixedPageEdit({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ key }, { ok }, site] = await Promise.all([params, searchParams, getCurrentSite()]);
  const def = getPageDef(key);
  // Los subdominios no tienen páginas predeterminadas
  if (!site.isMain || !def || key === "custom") notFound();
  const [pages, menu] = await Promise.all([getPageTexts(), getMenuModel()]);
  const t = pages[key];
  const values = {
    navLabel: t.navLabel,
    title: t.title,
    intro: t.intro,
    imageUrl: t.imageUrl,
    icon: t.icon,
    group: t.group,
    visible: t.visible,
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        /{" "}
        {def.hub ? (
          <span>{t.navLabel}</span>
        ) : (
          <Link href={`/admin/s/${key}`} className="hover:text-white">
            {t.navLabel}
          </Link>
        )}{" "}
        / <span className="text-zinc-300">Editar página</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white uppercase">Editar página: {t.navLabel}</h1>
          <p className="text-sm text-zinc-500">
            Página predeterminada del sitio · {def.hub ? "página principal de su sección" : "la dirección no cambia"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!def.hub && (
            <Link href={`/admin/s/${key}`} className="btn-ghost">
              <LayoutList className="h-4 w-4" /> Administrar contenido
            </Link>
          )}
          <Link href="/admin/menu" className="btn-ghost">
            <ListOrdered className="h-4 w-4" /> Menú y orden
          </Link>
          <Link href={def.path} target="_blank" className="btn-ghost">
            <ExternalLink className="h-4 w-4" /> Ver página
          </Link>
        </div>
      </div>

      {ok && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">Página guardada.</div>
      )}

      <FixedPageForm
        key={JSON.stringify(values)}
        pageKey={key}
        isHub={Boolean(def.hub)}
        address={`${siteLabel("")}${def.path}`}
        defaults={{
          navLabel: def.navLabel,
          title: def.title,
          intro: def.intro,
          imageUrl: def.image ?? "",
          icon: def.icon,
          group: def.group,
        }}
        values={values}
        groups={menu.groups.map((g) => ({ value: g.key, label: g.label }))}
      />
    </div>
  );
}
