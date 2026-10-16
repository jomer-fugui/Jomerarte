"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { saveCustomPageAction, type FormState } from "@/app/admin/actions";
import {
  GROUPS,
  GROUP_BASE,
  ICON_NAMES,
  PAGE_TYPES,
  SUGGESTED_TYPE,
  cleanSlug,
  getPageType,
  slugFromTitle,
  type GroupKey,
  type PageTypeKey,
} from "@/lib/sections";
import { cn } from "@/lib/format";
import { Icon } from "../icons";
import { GalleryInput, MediaInput } from "./MediaInput";
import { SubmitButton } from "./SubmitButton";

export type CustomPageValues = {
  title: string;
  slug: string;
  subtitle: string;
  content: string;
  imageUrl: string;
  gallery: string[];
  videoUrl: string;
  linkUrl: string;
  linkLabel: string;
  pageType: PageTypeKey;
  menuGroup: GroupKey;
  icon: string;
  published: boolean;
};

const EMPTY: CustomPageValues = {
  title: "",
  slug: "",
  subtitle: "",
  content: "",
  imageUrl: "",
  gallery: [],
  videoUrl: "",
  linkUrl: "",
  linkLabel: "",
  pageType: "page",
  menuGroup: "mas",
  icon: "",
  published: true,
};

const FORMAT_HINT =
  "Formato: **negrita**, *cursiva*, [texto](https://enlace), “- ” para listas, “## ” para subtítulos. Deja una línea en blanco para separar párrafos.";

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-bold text-white">
          {n}
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">{title}</h2>
          {hint && <p className="text-sm text-zinc-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Formulario para crear o editar una página: nombre, ubicación en el menú, tipo, textos, fotos e ícono. */
export function CustomPageForm({
  page,
  defaultGroup,
  host,
}: {
  page: (CustomPageValues & { id: number }) | null;
  defaultGroup?: GroupKey;
  host: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveCustomPageAction, null);
  const [v, setV] = useState<CustomPageValues>(() => {
    if (page) return { ...EMPTY, ...page };
    const group = defaultGroup ?? "mas";
    return { ...EMPTY, menuGroup: group, pageType: SUGGESTED_TYPE[group] };
  });
  const [slugEdited, setSlugEdited] = useState(Boolean(page));
  const [typeChosen, setTypeChosen] = useState(Boolean(page));
  const set = <K extends keyof CustomPageValues>(k: K, val: CustomPageValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const type = getPageType(v.pageType);
  const isList = type.key !== "page";
  const slug = slugEdited ? v.slug : slugFromTitle(v.title);
  const base = GROUP_BASE[v.menuGroup];

  function chooseGroup(g: GroupKey) {
    setV((p) => ({ ...p, menuGroup: g, pageType: typeChosen ? p.pageType : SUGGESTED_TYPE[g] }));
  }

  return (
    <form action={formAction} className="space-y-6">
      {page && <input type="hidden" name="id" value={page.id} />}
      <input type="hidden" name="pageType" value={v.pageType} />
      <input type="hidden" name="menuGroup" value={v.menuGroup} />
      <input type="hidden" name="icon" value={v.icon} />
      <input type="hidden" name="gallery" value={JSON.stringify(v.gallery)} />

      {state?.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{state.error}</div>
      )}

      <Step n={1} title="Nombre y ubicación" hint="Cómo se llama la página y en qué sección del menú aparece.">
        <div>
          <label className="label" htmlFor="cp-title">
            Nombre de la página
          </label>
          <input
            id="cp-title"
            name="title"
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ej: Emprendedores"
            className="input"
            required
          />
        </div>
        <div>
          <span className="label">¿En qué sección del menú la ubicas?</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => chooseGroup(g.key)}
                aria-pressed={v.menuGroup === g.key}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition",
                  v.menuGroup === g.key
                    ? "border-accent bg-accent/15 text-white"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30",
                )}
              >
                <Icon name={g.icon} className="h-4 w-4 shrink-0 text-accent-light" />
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cp-slug">
            Dirección de la página
          </label>
          <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950/80 focus-within:border-accent">
            <span className="max-w-[65%] shrink-0 truncate pl-3 text-sm text-zinc-500">
              {host}
              {base}/
            </span>
            <input
              id="cp-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                set("slug", e.target.value);
              }}
              onBlur={() => {
                if (slugEdited) set("slug", cleanSlug(v.slug));
              }}
              placeholder="Emprendedores"
              className="w-full min-w-0 bg-transparent px-1 py-2.5 text-sm text-zinc-100 focus:outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Se completa sola con el nombre. Solo letras, números y guiones.
          </p>
        </div>
      </Step>

      <Step
        n={2}
        title="Tipo de página"
        hint="Elige cómo se verá. Puedes cambiarlo cuando quieras: el contenido que cargues se conserva."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGE_TYPES.map((t) => {
            const active = v.pageType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTypeChosen(true);
                  set("pageType", t.key);
                }}
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
        {isList && (
          <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" />
            Después de guardar podrás agregar cada {type.itemLabel} con su foto, texto y enlace.
          </p>
        )}
      </Step>

      <Step n={3} title="Textos e imagen">
        <div>
          <label className="label">Subtítulo o introducción</label>
          <textarea
            name="subtitle"
            rows={3}
            value={v.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Una frase que explique de qué trata la página"
            className="input"
          />
        </div>
        <div>
          <label className="label">Imagen de cabecera (opcional)</label>
          <MediaInput name="imageUrl" value={v.imageUrl} onChange={(x) => set("imageUrl", x)} accept="image/*" />
        </div>
        <div>
          <label className="label">
            {isList ? "Texto adicional (opcional, se muestra antes de la lista)" : "Contenido de la página"}
          </label>
          <textarea
            name="content"
            rows={isList ? 5 : 14}
            value={v.content}
            onChange={(e) => set("content", e.target.value)}
            className="input font-mono text-[13px] leading-relaxed"
          />
          <p className="mt-1.5 text-xs text-zinc-500">{FORMAT_HINT}</p>
        </div>
      </Step>

      <Step n={4} title="Fotos, video y botón" hint="Todo es opcional.">
        <div>
          <label className="label">Galería de fotos y videos</label>
          <GalleryInput value={v.gallery} onChange={(g) => set("gallery", g)} />
        </div>
        <div>
          <label className="label">Video (YouTube, Vimeo o archivo)</label>
          <MediaInput
            name="videoUrl"
            value={v.videoUrl}
            onChange={(x) => set("videoUrl", x)}
            accept="video/*,audio/*"
            placeholder="https://youtube.com/watch?v=… o sube un archivo"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Enlace del botón</label>
            <input
              name="linkUrl"
              value={v.linkUrl}
              onChange={(e) => set("linkUrl", e.target.value)}
              placeholder="https://…"
              className="input"
            />
          </div>
          <div>
            <label className="label">Texto del botón</label>
            <input
              name="linkLabel"
              value={v.linkLabel}
              onChange={(e) => set("linkLabel", e.target.value)}
              placeholder="Ver más"
              className="input"
            />
          </div>
        </div>
      </Step>

      <Step n={5} title="Ícono y visibilidad">
        <div>
          <span className="label">Ícono en el menú</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set("icon", "")}
              aria-pressed={v.icon === ""}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                v.icon === "" ? "border-accent bg-accent/15 text-white" : "border-white/10 text-zinc-400 hover:border-white/30",
              )}
            >
              <Icon name={type.icon} className="h-4 w-4" /> Automático
            </button>
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
            name="published"
            checked={v.published}
            onChange={(e) => set("published", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Página publicada (visible en el menú y en el sitio)
        </label>
      </Step>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>{page ? "Guardar cambios" : isList ? "Crear página y agregar contenido" : "Crear página"}</SubmitButton>
        <Link href="/admin/s/custom" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
