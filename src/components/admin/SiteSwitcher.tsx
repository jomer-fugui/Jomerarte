import Link from "next/link";
import { Check, ChevronDown, Globe, Plus } from "lucide-react";
import { switchSiteAction } from "@/app/admin/actions";
import { cn } from "@/lib/format";
import { siteLabel } from "@/lib/hosts";
import type { SiteOverview } from "@/lib/site";

/** Selector del sitio que se está editando (principal o subdominios). */
export function SiteSwitcher({ sites, current, locked }: { sites: SiteOverview[]; current: string; locked: boolean }) {
  const active = sites.find((s) => s.slug === current) ?? sites[0];
  const name = active?.name ?? "Sitio";

  if (locked) {
    return (
      <span
        className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-zinc-200"
        title={siteLabel(current)}
      >
        <Globe className="h-4 w-4 shrink-0 text-accent-light" />
        <span className="max-w-[7rem] truncate sm:max-w-[12rem]">{name}</span>
      </span>
    );
  }

  return (
    <details className="relative min-w-0">
      <summary
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-zinc-200 transition hover:border-white/30"
        title="Cambiar el sitio que estás editando"
      >
        <Globe className="h-4 w-4 shrink-0 text-accent-light" />
        <span className="max-w-[7rem] truncate sm:max-w-[12rem]">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </summary>
      <div className="absolute top-full left-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
          ¿Qué sitio quieres editar?
        </p>
        {sites.map((s) => (
          <form key={s.slug || "principal"} action={switchSiteAction}>
            <input type="hidden" name="site" value={s.slug} />
            <input type="hidden" name="redirectTo" value="/admin" />
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/5",
                s.slug === current && "bg-accent/15",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{s.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {siteLabel(s.slug)}
                  {s.slug ? "" : " · principal"}
                </span>
              </span>
              {s.slug === current && <Check className="h-4 w-4 shrink-0 text-accent-light" />}
            </button>
          </form>
        ))}
        <Link
          href="/admin/sitios"
          className="mt-1 flex items-center gap-2 border-t border-white/10 px-2 pt-3 pb-2 text-sm font-semibold text-accent-light hover:text-white"
        >
          <Plus className="h-4 w-4" /> Crear o administrar subdominios
        </Link>
      </div>
    </details>
  );
}
