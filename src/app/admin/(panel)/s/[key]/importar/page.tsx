import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnySection, getItems } from "@/lib/data";
import { itemCategories } from "@/lib/format";
import { getCurrentSite } from "@/lib/site";
import { CheatImportForm } from "@/components/admin/CheatImportForm";

export const dynamic = "force-dynamic";

export default async function ImportCheatsPage({ params }: { params: Promise<{ key: string }> }) {
  const [{ key }, site] = await Promise.all([params, getCurrentSite()]);
  const found = await getAnySection(key);
  if (!found || found.section.layout !== "cheats") notFound();
  const section = found.section;
  const list = await getItems(key, { all: true });

  const games = [...new Set(list.map((it) => it.title.trim()).filter(Boolean))];
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
        / <span className="text-zinc-300">Importar trucos</span>
      </nav>

      <div>
        <h1 className="font-display text-3xl font-bold text-white uppercase">Importar trucos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cargá de una sola vez todos los trucos de un juego, pegados desde Excel o escritos a mano.
          {games.length > 0 && ` Ya hay ${games.length} ${games.length === 1 ? "juego" : "juegos"} cargados.`}
        </p>
      </div>

      <CheatImportForm sectionKey={key} site={site.slug} games={games} categories={cats} />
    </div>
  );
}
