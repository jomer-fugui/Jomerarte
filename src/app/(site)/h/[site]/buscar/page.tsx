import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Search, Tag } from "lucide-react";
import { searchSite } from "@/lib/search";
import { siteFromSlug } from "@/lib/site";
import { Icon } from "@/components/icons";
import { ItemImage } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ site: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryOf(sp: Record<string, string | string[] | undefined>): string {
  const q = sp.q;
  return (typeof q === "string" ? q : Array.isArray(q) ? (q[0] ?? "") : "").trim().slice(0, 100);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = queryOf(await searchParams);
  return { title: q ? `Buscar: ${q}` : "Buscar", robots: { index: false, follow: true } };
}

/** Resultados de la lupa: busca por nombre o categoría en todas las páginas del sitio actual. */
export default async function SearchPage({ params, searchParams }: Props) {
  const q = queryOf(await searchParams);
  const site = await siteFromSlug((await params).site);
  const results = q ? await searchSite(site, q) : null;

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute -top-24 -right-24 -z-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="container-x py-12 sm:py-16">
          <p className="eyebrow">Buscador</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-white uppercase sm:text-5xl">
            {q ? `Resultados para “${q}”` : "¿Qué estás buscando?"}
          </h1>
          <Form action="/buscar" className="relative mt-7 max-w-2xl" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              required
              autoFocus={!q}
              enterKeyHint="search"
              placeholder="Buscar por nombre o categoría…"
              aria-label="Buscar por nombre o categoría"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 py-4 pr-32 pl-12 text-lg text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button type="submit" className="btn-primary absolute top-1/2 right-2 -translate-y-1/2">
              Buscar
            </button>
          </Form>
          {results && (
            <p className="mt-4 text-sm text-zinc-400">
              {results.total === 0
                ? "No encontramos coincidencias."
                : `${results.total} ${results.total === 1 ? "resultado" : "resultados"}`}
            </p>
          )}
        </div>
      </section>

      <div className="container-x space-y-14 py-12">
        {!q && (
          <p className="max-w-xl text-zinc-400">
            Escribe el nombre de un juego, producto, frase o una categoría (por ejemplo “acción”, “android”, “consejos”).
          </p>
        )}

        {results && results.categories.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-white uppercase">
              <Tag className="h-5 w-5 text-accent-light" /> Categorías
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {results.categories.map((c) => (
                <Link key={`${c.label}-${c.name}`} href={c.href} className="chip hover:border-accent hover:text-white">
                  {c.name}
                  <span className="opacity-60">
                    en {c.label} · {c.count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results?.groups.map((g) => (
          <section key={g.key}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-wide text-white uppercase">
                <Icon name={g.icon} className="h-5 w-5 text-accent-light" /> {g.label}
                <span className="text-base font-normal text-zinc-500">({g.total})</span>
              </h2>
              {g.href && g.total > g.hits.length && (
                <Link href={g.href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-light hover:text-white">
                  Ver los {g.total} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.hits.map((h) => (
                <Link key={h.id} href={h.href} className="card card-hover group flex gap-4 overflow-hidden p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:h-24 sm:w-24">
                    <ItemImage src={h.image} alt={h.title} icon={h.icon} className="transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <p className="line-clamp-2 font-display text-lg leading-tight font-bold text-white group-hover:text-accent-light">
                      {h.title}
                    </p>
                    {h.cats.length > 0 && (
                      <p className="mt-1 truncate text-[11px] font-semibold tracking-wider text-accent-light uppercase">
                        {h.cats.slice(0, 4).join(" · ")}
                      </p>
                    )}
                    {h.snippet && h.snippet !== h.title && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{h.snippet}</p>}
                    {h.price && <p className="mt-1 text-sm font-semibold text-white">{h.price}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {results && results.total === 0 && results.categories.length === 0 && (
          <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
            <Search className="h-10 w-10 text-zinc-600" />
            <p className="font-display text-xl font-bold text-white uppercase">Sin resultados</p>
            <p className="max-w-md text-sm text-zinc-400">
              Revisa cómo está escrito o prueba con una palabra más corta o con una categoría.
            </p>
            <Link href="/" className="btn-ghost btn-sm mt-1">
              Ir al inicio
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
