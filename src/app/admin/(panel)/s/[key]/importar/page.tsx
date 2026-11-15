import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnySection, getItems } from "@/lib/data";
import { itemCategories } from "@/lib/format";
import { getCurrentSite } from "@/lib/site";
import { ListImportForm } from "@/components/admin/ListImportForm";

export const dynamic = "force-dynamic";

export default async function ImportListPage({ params }: { params: Promise<{ key: string }> }) {
  const [{ key }, site] = await Promise.all([params, getCurrentSite()]);
  const found = await getAnySection(key);
  const layout = found?.section.layout;
  if (!found || (layout !== "cheats" && layout !== "files")) notFound();
  const section = found.section;
  const kind = layout === "cheats" ? "cheats" : "files";
  const isCheats = kind === "cheats";
  const list = await getItems(key, { all: true });

  const groups = [...new Set(list.map((it) => it.title.trim()).filter(Boolean))];
  const cats = [...new Set(list.flatMap((it) => itemCategories(it)))].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        /{" "}
        <Link href={`/admin/s/${key}`} className="hover:text-white">
          {section.title}
        </Link>{" "}
        / <span className="text-zinc-300">{isCheats ? "Importar trucos" : "Importar archivos"}</span>
      </nav>

      <div>
        <h1 className="font-display text-3xl font-bold text-white uppercase">
          {isCheats ? "Importar trucos" : "Importar archivos"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {isCheats
            ? "Cargá de una sola vez todos los trucos de un juego, pegados desde Excel o escritos a mano."
            : "Cargá de una sola vez todos los archivos de una lista, pegados desde Excel o escritos a mano."}
          {groups.length > 0 &&
            ` Ya hay ${groups.length} ${groups.length === 1 ? (isCheats ? "juego" : "lista") : isCheats ? "juegos" : "listas"} cargados.`}
        </p>
      </div>

      <ListImportForm kind={kind} sectionKey={key} site={site.slug} groups={groups} categories={cats} />
    </div>
  );
}
