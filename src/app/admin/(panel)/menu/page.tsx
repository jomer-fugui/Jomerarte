import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutList, Pencil, Plus, RotateCcw } from "lucide-react";
import { getMenuModel } from "@/lib/data";
import { cn } from "@/lib/format";
import type { MenuEntry } from "@/lib/nav";
import { getCurrentSite } from "@/lib/site";
import { ConfirmButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import {
  moveEntryToGroupAction,
  moveMenuEntryAction,
  moveMenuGroupAction,
  renameMenuGroupAction,
  resetMenuAction,
  toggleMenuEntryAction,
} from "../../menu-actions";

export const dynamic = "force-dynamic";

type Action = (formData: FormData) => Promise<void>;

function Arrow({ action, value, dir, disabled, label }: { action: Action; value: string; dir: "up" | "down"; disabled: boolean; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="key" value={value} />
      <input type="hidden" name="dir" value={dir} />
      <button
        type="submit"
        disabled={disabled}
        title={`${dir === "up" ? "Subir" : "Bajar"} ${label}`}
        aria-label={`${dir === "up" ? "Subir" : "Bajar"} ${label}`}
        className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
      >
        {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </button>
    </form>
  );
}

function EyeToggle({ value, visible, label }: { value: string; visible: boolean; label: string }) {
  return (
    <form action={toggleMenuEntryAction}>
      <input type="hidden" name="key" value={value} />
      <button
        type="submit"
        title={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </form>
  );
}

function EntryRow({
  e,
  index,
  total,
  groups,
  mainSite,
}: {
  e: MenuEntry;
  index: number;
  total: number;
  groups: { value: string; label: string }[];
  mainSite: boolean;
}) {
  const editHref = e.kind === "fixed" ? `/admin/pagina/${e.key}` : `/admin/s/custom/${e.custom?.item.id}`;
  const kind = e.kind === "fixed" ? "predeterminada" : `nueva · ${e.custom?.type.label ?? "página"}`;
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 p-3", !e.visible && "opacity-60")}>
      <div className="flex flex-col">
        <Arrow action={moveMenuEntryAction} value={e.key} dir="up" disabled={index === 0} label={e.navLabel} />
        <Arrow action={moveMenuEntryAction} value={e.key} dir="down" disabled={index === total - 1} label={e.navLabel} />
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-light">
        <Icon name={e.icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{e.navLabel}</p>
        <p className="truncate text-xs text-zinc-500">
          {e.path} · {kind}
          {!mainSite && e.custom?.menuLabel ? ` · menú “${e.custom.menuLabel}”` : ""}
          {!e.visible ? " · oculta" : ""}
        </p>
      </div>
      {mainSite && (
        <form action={moveEntryToGroupAction} className="shrink-0">
          <input type="hidden" name="key" value={e.key} />
          <AutoSubmitSelect
            name="group"
            defaultValue={e.group}
            options={groups}
            label={`Sección del menú de ${e.navLabel}`}
            className="input w-auto max-w-[11rem] py-1.5 text-xs"
          />
        </form>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <EyeToggle value={e.key} visible={e.visible} label={e.navLabel} />
        {e.def && (
          <Link
            href={`/admin/s/${e.key}`}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Administrar contenido"
            aria-label={`Administrar contenido de ${e.navLabel}`}
          >
            <LayoutList className="h-4 w-4" />
          </Link>
        )}
        <Link
          href={editHref}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          title="Editar página"
          aria-label={`Editar ${e.navLabel}`}
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}

/** Ordenar el menú: secciones y páginas (predeterminadas y nuevas), renombrar, ocultar y mover. */
export default async function MenuPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [site, menu, sp] = await Promise.all([getCurrentSite(), getMenuModel(), searchParams]);
  const groups = menu.groups.map((g) => ({ value: g.key, label: g.label }));
  const subEntries = site.isMain ? [] : (menu.groups[0]?.entries ?? []);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Menú y orden</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white uppercase">Menú y orden</h1>
          <p className="mt-1 max-w-3xl text-zinc-400">
            {site.isMain
              ? "Ordena las secciones del menú y las páginas de cada sección (las predeterminadas y las que creaste). También puedes renombrar las secciones, ocultar páginas, moverlas de sección y editarlas."
              : "Ordena las páginas de este sitio: el menú sigue este mismo orden. También puedes ocultarlas o editarlas."}
          </p>
        </div>
        {site.isMain && (
          <form action={resetMenuAction}>
            <ConfirmButton
              message="¿Volver al orden y los nombres originales del menú? Las páginas que moviste de sección vuelven a su lugar original."
              className="btn-ghost"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar menú original
            </ConfirmButton>
          </form>
        )}
      </div>

      {sp.ok === "reset" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Menú restaurado: orden, nombres y secciones originales.
        </div>
      )}
      {sp.error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{sp.error}</div>}

      {site.isMain ? (
        menu.groups.map((g, gi) => (
          <section key={g.key} id={`g-${g.key}`} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[0.03] p-3 sm:p-4">
              <div className="flex flex-col">
                <Arrow action={moveMenuGroupAction} value={g.key} dir="up" disabled={gi === 0} label={`la sección ${g.label}`} />
                <Arrow
                  action={moveMenuGroupAction}
                  value={g.key}
                  dir="down"
                  disabled={gi === menu.groups.length - 1}
                  label={`la sección ${g.label}`}
                />
              </div>
              <Icon name={g.icon} className="h-5 w-5 shrink-0 text-accent-light" />
              <form action={renameMenuGroupAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="key" value={g.key} />
                <input
                  name="label"
                  defaultValue={g.label}
                  placeholder={g.defaultLabel}
                  maxLength={60}
                  aria-label={`Nombre de la sección ${g.label} en el menú`}
                  className="input max-w-xs py-1.5 font-semibold"
                />
                <button type="submit" className="btn-ghost btn-sm">
                  Renombrar
                </button>
              </form>
              {g.hub && (
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <span>
                    Página principal:{" "}
                    <Link href={`/admin/pagina/${g.hub.key}`} className="font-semibold text-zinc-200 hover:text-white">
                      {g.hub.path}
                    </Link>
                    {!g.hubVisible && " (oculta)"}
                  </span>
                  <EyeToggle value={g.hub.key} visible={g.hubVisible} label="la página principal" />
                </div>
              )}
            </div>
            {g.entries.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                Esta sección no tiene páginas y no aparece en el menú. Mueve una página aquí o{" "}
                <Link href={`/admin/s/custom/nuevo?grupo=${g.key}`} className="font-semibold text-accent-light hover:underline">
                  crea una nueva
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {g.entries.map((e, i) => (
                  <EntryRow key={e.key} e={e} index={i} total={g.entries.length} groups={groups} mainSite />
                ))}
              </ul>
            )}
            <div className="border-t border-white/5 px-4 py-2">
              <Link
                href={`/admin/s/custom/nuevo?grupo=${g.key}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent-light hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Página nueva en {g.label}
              </Link>
            </div>
          </section>
        ))
      ) : (
        <section className="card overflow-hidden">
          {subEntries.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">
              Este sitio todavía no tiene páginas.{" "}
              <Link href="/admin/s/custom/nuevo" className="font-semibold text-accent-light hover:underline">
                Crea la primera
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {subEntries.map((e, i) => (
                <EntryRow key={e.key} e={e} index={i} total={subEntries.length} groups={groups} mainSite={false} />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card space-y-2 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Cómo funciona</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Las flechas cambian el orden en el menú, en las pestañas, en la portada y en la página principal de cada sección.</li>
          <li>El ojo oculta la página para los visitantes sin borrar su contenido.</li>
          {site.isMain ? (
            <>
              <li>
                Al mover una página <strong>predeterminada</strong> de sección, su dirección no cambia (por ejemplo, /Cursos sigue
                siendo /Cursos). Las páginas <strong>nuevas</strong> toman la dirección de su sección.
              </li>
              <li>Una sección sin páginas visibles no aparece en el menú.</li>
            </>
          ) : (
            <li>Para agrupar páginas en un menú desplegable, edita cada página y escribe el mismo nombre en “Sección del menú”.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
