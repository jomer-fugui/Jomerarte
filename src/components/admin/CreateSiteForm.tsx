"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { createSiteAction, type FormState } from "@/app/admin/actions";
import { cn } from "@/lib/format";
import { SITE_TEMPLATES, getSiteTemplate } from "@/lib/site-templates";
import { Icon } from "../icons";
import { SubmitButton } from "./SubmitButton";

/** Formulario para crear un subdominio nuevo (un sitio independiente). */
export function CreateSiteForm({ root }: { root: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(createSiteAction, null);
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("blank");
  const tpl = getSiteTemplate(template);
  const copyable = tpl.pages.filter((p) => p.copyFrom);

  return (
    <form action={formAction} className="card space-y-6 p-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Crear un subdominio nuevo</h2>
        <p className="text-sm text-zinc-500">
          Será un sitio completamente independiente, con su propio nombre, logo, portada, menú y páginas.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{state.error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="site-slug">
            Subdominio
          </label>
          <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950/80 focus-within:border-accent">
            <input
              id="site-slug"
              name="slug"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, ""),
                )
              }
              placeholder="juegos"
              required
              maxLength={40}
              autoComplete="off"
              className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm text-zinc-100 focus:outline-none"
            />
            <span className="shrink-0 pr-3 text-sm text-zinc-500">.{root}</span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">Solo letras minúsculas, números y guiones.</p>
        </div>
        <div>
          <label className="label" htmlFor="site-name">
            Nombre del sitio
          </label>
          <input id="site-name" name="name" placeholder="Ej: Juegos de Jomer" maxLength={120} className="input" />
          <p className="mt-1.5 text-xs text-zinc-500">Lo puedes cambiar después en Ajustes.</p>
        </div>
      </div>

      <div>
        <span className="label">Plantilla para empezar</span>
        <input type="hidden" name="template" value={template} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_TEMPLATES.map((t) => {
            const active = t.key === template;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTemplate(t.key)}
                aria-pressed={active}
                className={cn(
                  "relative flex gap-3 rounded-xl border p-4 text-left transition",
                  active ? "border-accent bg-accent/10 ring-2 ring-accent/30" : "border-white/10 bg-white/[0.03] hover:border-white/30",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    active ? "bg-accent text-white" : "bg-white/5 text-accent-light",
                  )}
                >
                  <Icon name={t.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 pr-4">
                  <span className="block font-semibold text-white">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400">{t.description}</span>
                </span>
                {active && <Check className="absolute top-3 right-3 h-4 w-4 text-accent-light" />}
              </button>
            );
          })}
        </div>
      </div>

      {copyable.length > 0 && (
        <label className="flex items-start gap-2 text-sm text-zinc-200">
          <input type="checkbox" name="copy" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>
            Copiar el contenido que ya tengo en el sitio principal ({copyable.map((p) => p.title).join(", ")}). Después cada
            sitio se edita por separado.
          </span>
        </label>
      )}

      <SubmitButton icon={false} pendingLabel="Creando…">
        Crear sitio
      </SubmitButton>
    </form>
  );
}
