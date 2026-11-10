"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, Wand2 } from "lucide-react";
import { saveItemAction, type FormState } from "@/app/admin/actions";
import { PLATFORMS, detectPlatform } from "@/lib/platforms";
import type { ItemLink } from "@/lib/links";
import type { FieldKey, SectionDef } from "@/lib/sections";
import { cn } from "@/lib/format";
import { CategoryPicker, LinksEditor } from "./fields";
import { MlPriceBox } from "./MlPriceBox";
import { isMlUrl, type MlInfo } from "@/lib/ml-ref";
import { GalleryInput, MediaInput } from "./MediaInput";
import { SubmitButton } from "./SubmitButton";

export type ItemValues = {
  title: string;
  subtitle: string;
  content: string;
  category: string;
  categories: string[];
  imageUrl: string;
  gallery: string[];
  videoUrl: string;
  linkUrl: string;
  linkLabel: string;
  links: ItemLink[];
  platform: string;
  price: string;
  unit: string;
  rating: number;
  location: string;
  code: string;
  purpose: string;
  slug: string;
  featured: boolean;
  published: boolean;
  /** Mercado Libre: lo escrito en el recuadro, el código vinculado y si el precio se actualiza solo */
  mlRef: string;
  mlId: string;
  mlType: string;
  mlSync: boolean;
};

const EMPTY: ItemValues = {
  title: "",
  subtitle: "",
  content: "",
  category: "",
  categories: [],
  imageUrl: "",
  gallery: [],
  videoUrl: "",
  linkUrl: "",
  linkLabel: "",
  links: [],
  platform: "",
  price: "",
  unit: "",
  rating: 0,
  location: "",
  code: "",
  purpose: "",
  slug: "",
  featured: false,
  published: true,
  mlRef: "",
  mlId: "",
  mlType: "",
  mlSync: true,
};

const FORMAT_HINT =
  "Formato: **negrita**, *cursiva*, [texto](https://enlace), “- ” para listas, “## ” para subtítulos. Deja una línea en blanco para separar párrafos.";

function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function ItemForm({
  section,
  item,
  site,
  suggestions = [],
  ml,
}: {
  section: Pick<SectionDef, "key" | "fields" | "categories" | "itemLabel" | "layout">;
  item: (ItemValues & { id: number }) | null;
  /** Sitio en el que se abrió el formulario (evita guardar en otro si se cambia de sitio en otra pestaña) */
  site?: string;
  /** Categorías que ya se usan en esta sección (para sugerirlas) */
  suggestions?: string[];
  /** Precio automático de Mercado Libre */
  ml?: { connected: boolean; info: MlInfo | null; savedId: string };
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveItemAction, null);
  const [v, setV] = useState<ItemValues>(() => {
    if (!item) return EMPTY;
    const cats = item.categories?.length ? item.categories : item.category ? [item.category] : [];
    return { ...EMPTY, ...item, categories: cats, links: item.links ?? [] };
  });
  const [fetching, setFetching] = useState(false);
  const [autoMsg, setAutoMsg] = useState("");
  const f = section.fields;
  const has = (k: FieldKey) => Boolean(f[k]);
  const set = <K extends keyof ItemValues>(k: K, val: ItemValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const multiCategory = has("category") && section.layout !== "prices";
  const categorySuggestions = Array.from(new Set([...(section.categories ?? []), ...suggestions]));
  const longText = ["story", "custom", "poems", "songs", "characters", "devlog", "inventions", "games"].includes(section.layout);
  const isCheats = section.layout === "cheats";
  const mlCapable = has("price") && (has("linkUrl") || section.layout === "prices");
  const mlRelated = v.mlId !== "" || v.platform === "mercadolibre" || isMlUrl(v.linkUrl);

  async function autofill() {
    if (!v.linkUrl) return;
    setFetching(true);
    setAutoMsg("");
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(v.linkUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el enlace");
      setV((p) => ({
        ...p,
        title: p.title || data.title || "",
        content: has("content") ? p.content || data.description || "" : p.content,
        imageUrl: has("imageUrl") ? p.imageUrl || data.image || "" : p.imageUrl,
        price: has("price") ? p.price || data.price || "" : p.price,
        platform: has("platform") ? p.platform || data.platform || "" : p.platform,
      }));
      setAutoMsg("Listo: se completaron los campos vacíos. Revísalos antes de guardar.");
    } catch (e) {
      setAutoMsg(e instanceof Error ? e.message : "No se pudo leer el enlace.");
    } finally {
      setFetching(false);
    }
  }

  const linkBlock = has("linkUrl") && (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
      <Field label={f.linkUrl}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="linkUrl"
            value={v.linkUrl}
            onChange={(e) => {
              const url = e.target.value;
              setV((p) => ({
                ...p,
                linkUrl: url,
                platform: has("platform") && !p.platform && /^https?:\/\//.test(url) ? detectPlatform(url) : p.platform,
              }));
            }}
            placeholder="https://…"
            className="input"
          />
          <button type="button" onClick={autofill} disabled={!v.linkUrl || fetching} className="btn-ghost shrink-0">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Autocompletar
          </button>
        </div>
      </Field>
      {autoMsg && <p className="text-xs text-zinc-400">{autoMsg}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {has("platform") && (
          <Field label={f.platform}>
            <select name="platform" value={v.platform} onChange={(e) => set("platform", e.target.value)} className="input">
              <option value="">— Detectar automáticamente —</option>
              {PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {has("linkLabel") && (
          <Field label={f.linkLabel}>
            <input
              name="linkLabel"
              value={v.linkLabel}
              onChange={(e) => set("linkLabel", e.target.value)}
              placeholder="Automático"
              className="input"
            />
          </Field>
        )}
      </div>
    </div>
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="section" value={section.key} />
      {site !== undefined && <input type="hidden" name="__site" value={site} />}
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="gallery" value={JSON.stringify(v.gallery)} />
      {multiCategory && <input type="hidden" name="categories" value={JSON.stringify(v.categories)} />}
      {has("links") && <input type="hidden" name="links" value={JSON.stringify(v.links)} />}
      {mlCapable && (
        <>
          <input type="hidden" name="__ml" value="1" />
          <input type="hidden" name="mlRef" value={v.mlRef} />
          <input type="hidden" name="mlId" value={v.mlId} />
          <input type="hidden" name="mlType" value={v.mlType} />
          {v.mlSync && <input type="hidden" name="mlSync" value="on" />}
        </>
      )}
      {!has("linkUrl") && has("platform") && <input type="hidden" name="platform" value={v.platform} />}

      {state?.error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{state.error}</div>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Información</h2>
        {section.layout === "products" && linkBlock}

        {has("title") && (
          <Field label={f.title}>
            <input name="title" value={v.title} onChange={(e) => set("title", e.target.value)} className="input" />
          </Field>
        )}
        {has("subtitle") && (
          <Field label={f.subtitle}>
            <input name="subtitle" value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="input" />
          </Field>
        )}
        {has("category") &&
          (multiCategory ? (
            <Field label={f.category} hint="Toca las sugerencias para agregarlas o escribe categorías nuevas. Puedes elegir varias.">
              <CategoryPicker value={v.categories} onChange={(c) => set("categories", c)} suggestions={categorySuggestions} />
            </Field>
          ) : (
            <Field label={f.category}>
              <input
                name="category"
                value={v.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Escribe o elige una"
                className="input"
              />
              {categorySuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categorySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("category", c)}
                      className={cn("chip hover:border-white/30", v.category === c && "chip-active")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </Field>
          ))}
        {(has("code") || has("purpose")) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {has("code") && (
              <Field label={f.code} hint="Tal cual se escribe en el juego. Cada truco tiene su botón para copiarlo.">
                <input
                  name="code"
                  value={v.code}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="LXGIWYL"
                  className="input font-mono"
                />
              </Field>
            )}
            {has("purpose") && (
              <Field label={f.purpose} hint="También se puede buscar por este texto (ej: “armas”, “sin policías”).">
                <input
                  name="purpose"
                  value={v.purpose}
                  onChange={(e) => set("purpose", e.target.value)}
                  placeholder="Pack de armas 1"
                  className="input"
                />
              </Field>
            )}
          </div>
        )}
        {has("content") && (
          <Field label={f.content} hint={FORMAT_HINT}>
            <textarea
              name="content"
              rows={isCheats ? 3 : longText ? 14 : 6}
              value={v.content}
              onChange={(e) => set("content", e.target.value)}
              className="input font-mono text-[13px] leading-relaxed"
            />
          </Field>
        )}

        {(has("price") || has("unit") || has("rating") || has("location")) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {has("price") && (
              <Field label={f.price}>
                <input
                  name="price"
                  value={v.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder={section.layout === "games" ? "Gratis" : "$ 0"}
                  className="input"
                />
              </Field>
            )}
            {has("unit") && (
              <Field label={f.unit}>
                <input name="unit" value={v.unit} onChange={(e) => set("unit", e.target.value)} className="input" />
              </Field>
            )}
            {has("rating") && (
              <Field label={f.rating}>
                <select name="rating" value={v.rating} onChange={(e) => set("rating", Number(e.target.value))} className="input">
                  <option value={0}>Sin puntuación</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)}
                      {"☆".repeat(5 - n)} ({n})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {has("location") && (
              <Field label={f.location}>
                <input name="location" value={v.location} onChange={(e) => set("location", e.target.value)} className="input" />
              </Field>
            )}
          </div>
        )}

        {section.layout !== "products" && linkBlock}
        {mlCapable && (
          <MlPriceBox
            value={{ mlRef: v.mlRef, mlId: v.mlId, mlType: v.mlType, mlSync: v.mlSync }}
            onChange={(m) => setV((p) => ({ ...p, ...m }))}
            onPrice={(price) => set("price", price)}
            linkUrl={v.linkUrl}
            connected={ml?.connected ?? false}
            info={ml?.info ?? null}
            savedId={ml?.savedId ?? ""}
            related={mlRelated}
          />
        )}
      </section>

      {has("links") && (
        <section className="card space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">{f.links}</h2>
            <p className="text-sm text-zinc-500">
              Cada botón tiene el nombre que tú quieras, por ejemplo “Descargar por Mediafire” o “Descargar por Google Drive”.
              El color y el ícono se ponen solos según el servicio.
            </p>
          </div>
          <LinksEditor value={v.links} onChange={(l) => set("links", l)} />
        </section>
      )}

      {(has("imageUrl") || has("videoUrl") || has("gallery")) && (
        <section className="card space-y-5 p-6">
          <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Imágenes y videos</h2>
          {has("imageUrl") && (
            <Field label={f.imageUrl}>
              <MediaInput name="imageUrl" value={v.imageUrl} onChange={(x) => set("imageUrl", x)} accept="image/*" />
            </Field>
          )}
          {has("videoUrl") && (
            <Field
              label={f.videoUrl}
              hint="Pega un enlace de YouTube o Vimeo, o sube un video/audio. Para videos largos lo mejor es YouTube."
            >
              <MediaInput
                name="videoUrl"
                value={v.videoUrl}
                onChange={(x) => set("videoUrl", x)}
                accept="video/*,audio/*"
                placeholder="https://youtube.com/watch?v=… o sube un archivo"
              />
            </Field>
          )}
          {has("gallery") && (
            <Field label={f.gallery}>
              <GalleryInput value={v.gallery} onChange={(g) => set("gallery", g)} />
            </Field>
          )}
        </section>
      )}

      <section className="card flex flex-wrap items-center gap-6 p-6">
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            name="published"
            checked={v.published}
            onChange={(e) => set("published", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Publicado (visible en el sitio)
        </label>
        {section.key !== "custom" && (
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="featured"
              checked={v.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Destacado en la portada
          </label>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>Guardar {section.itemLabel}</SubmitButton>
        <Link href={`/admin/s/${section.key}`} className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
