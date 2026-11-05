"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { savePageAction } from "@/app/admin/actions";
import { cn } from "@/lib/format";
import { ICON_NAMES, type IconName } from "@/lib/sections";
import { Icon } from "../icons";
import { MediaInput } from "./MediaInput";
import { SubmitButton } from "./SubmitButton";

export type FixedPageValues = {
  navLabel: string;
  title: string;
  intro: string;
  imageUrl: string;
  icon: IconName;
  group: string;
  visible: boolean;
};

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-6">
      <div>
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">{title}</h2>
        {hint && <p className="text-sm text-zinc-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Edición de una página predeterminada del sitio: nombre, textos, imagen, ícono, sección y visibilidad. */
export function FixedPageForm({
  pageKey,
  isHub,
  address,
  defaults,
  values,
  groups,
}: {
  pageKey: string;
  isHub: boolean;
  /** Dirección completa para mostrar (no se puede cambiar) */
  address: string;
  defaults: Omit<FixedPageValues, "visible">;
  values: FixedPageValues;
  groups: { value: string; label: string }[];
}) {
  const [v, setV] = useState<FixedPageValues>(values);
  const set = <K extends keyof FixedPageValues>(k: K, val: FixedPageValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const changed =
    v.navLabel !== defaults.navLabel ||
    v.title !== defaults.title ||
    v.intro !== defaults.intro ||
    v.imageUrl !== defaults.imageUrl ||
    v.icon !== defaults.icon ||
    (!isHub && v.group !== defaults.group);

  return (
    <form action={savePageAction} className="space-y-6">
      <input type="hidden" name="key" value={pageKey} />
      <input type="hidden" name="icon" value={v.icon} />

      <Card title="Nombre y ubicación">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fp-nav">
              {isHub ? "Nombre de la sección en el menú" : "Nombre en el menú"}
            </label>
            <input
              id="fp-nav"
              name="navLabel"
              value={v.navLabel}
              onChange={(e) => set("navLabel", e.target.value)}
              placeholder={defaults.navLabel}
              maxLength={200}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="fp-title">
              Título de la página
            </label>
            <input
              id="fp-title"
              name="title"
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={defaults.title}
              maxLength={500}
              className="input"
            />
          </div>
        </div>
        {isHub ? (
          <p className="text-sm text-zinc-500">
            Es la página principal de su sección: su nombre también es el nombre de la sección en el menú. Dirección:{" "}
            <span className="text-zinc-300">{address}</span>
          </p>
        ) : (
          <div>
            <label className="label" htmlFor="fp-group">
              Sección del menú donde aparece
            </label>
            <select id="fp-group" name="menuGroup" value={v.group} onChange={(e) => set("group", e.target.value)} className="input">
              {groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                  {g.value === defaults.group ? " (original)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">
              La dirección no cambia: <span className="text-zinc-300">{address}</span>. El orden dentro de la sección se cambia en{" "}
              <Link href="/admin/menu" className="font-semibold text-accent-light underline">
                Menú y orden
              </Link>
              .
            </p>
          </div>
        )}
      </Card>

      <Card title="Textos e imagen">
        <div>
          <label className="label" htmlFor="fp-intro">
            Introducción
          </label>
          <textarea id="fp-intro" name="intro" rows={4} value={v.intro} onChange={(e) => set("intro", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Imagen de cabecera</label>
          <MediaInput name="imageUrl" value={v.imageUrl} onChange={(x) => set("imageUrl", x)} accept="image/*" />
        </div>
      </Card>

      <Card title="Ícono y visibilidad">
        <div>
          <span className="label">Ícono en el menú y en la página</span>
          <div className="flex flex-wrap gap-2">
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={`Ícono ${name}`}
                aria-pressed={v.icon === name}
                onClick={() => set("icon", name)}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-lg border transition",
                  v.icon === name
                    ? "border-accent bg-accent/15 text-white"
                    : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white",
                  name === defaults.icon && v.icon !== name && "border-dashed",
                )}
              >
                <Icon name={name} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            name="visible"
            checked={v.visible}
            onChange={(e) => set("visible", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Página visible en el sitio y en el menú
        </label>
      </Card>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>Guardar página</SubmitButton>
        <button type="button" onClick={() => setV((p) => ({ ...p, ...defaults }))} disabled={!changed} className="btn-ghost">
          <RotateCcw className="h-4 w-4" /> Restaurar valores originales
        </button>
      </div>
    </form>
  );
}
