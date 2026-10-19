"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/format";
import { LINK_LABEL_SUGGESTIONS, MAX_LINKS, linkProvider, safeUrl, type ItemLink } from "@/lib/links";
import { Icon } from "../icons";

/** Selector de varias categorías: sugerencias para tocar y la opción de crear nuevas. */
export function CategoryPicker({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = useState("");
  const has = (c: string) => value.some((v) => v.toLowerCase() === c.toLowerCase());
  const toggle = (c: string) => onChange(has(c) ? value.filter((v) => v.toLowerCase() !== c.toLowerCase()) : [...value, c].slice(0, 20));
  const add = () => {
    const parts = text
      .split(",")
      .map((p) => p.replace(/\s+/g, " ").trim().slice(0, 60))
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next.slice(0, 20));
    setText("");
  };
  const extra = suggestions.filter((s) => !has(s));

  return (
    <div className="space-y-3">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/80 p-2">
        {value.length === 0 && <span className="px-1 text-sm text-zinc-600">Ninguna categoría elegida</span>}
        {value.map((c) => (
          <span key={c} className="chip chip-active gap-1 pr-1.5">
            {c}
            <button
              type="button"
              onClick={() => toggle(c)}
              className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/30"
              aria-label={`Quitar ${c}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {extra.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extra.map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)} className="chip hover:border-white/30 hover:text-white">
              <Plus className="h-3 w-3" /> {c}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nueva categoría (puedes escribir varias separadas por comas)"
          className="input"
        />
        <button type="button" onClick={add} disabled={!text.trim()} className="btn-ghost shrink-0 px-3">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>
    </div>
  );
}

/** Editor de botones con nombre personalizado: “Descargar por Mediafire”, “Descargar por Google Drive”… */
export function LinksEditor({ value, onChange }: { value: ItemLink[]; onChange: (v: ItemLink[]) => void }) {
  const update = (i: number, patch: Partial<ItemLink>) => onChange(value.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addRow = (label = "") => {
    if (value.length < MAX_LINKS) onChange([...value, { label, url: "" }]);
  };

  return (
    <div className="space-y-3">
      {value.map((l, i) => {
        const url = safeUrl(l.url);
        const p = url ? linkProvider(url) : null;
        const invalid = l.url.trim() !== "" && !url;
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                style={{ background: p?.color ?? "#3f3f46" }}
                title={p?.name ?? "Enlace"}
              >
                <Icon name={p?.icon ?? "link"} className="h-4 w-4" />
              </span>
              <input
                value={l.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={p?.defaultLabel ?? "Nombre del botón (ej: Descargar por Mediafire)"}
                maxLength={80}
                className="input"
                aria-label="Nombre del botón"
              />
              <div className="flex shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20" aria-label="Subir">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                  aria-label="Bajar"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(i)} className="rounded p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-300" aria-label="Quitar enlace">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={l.url}
              onChange={(e) => {
                const nextUrl = e.target.value;
                const safe = safeUrl(nextUrl);
                // Si el botón todavía no tiene nombre, se sugiere uno según el servicio
                update(i, { url: nextUrl, label: l.label || !safe ? l.label : linkProvider(safe).defaultLabel });
              }}
              placeholder="https://www.mediafire.com/file/…"
              className={cn("input mt-2", invalid && "border-red-500/60")}
              aria-label="Dirección del enlace"
              inputMode="url"
            />
            {invalid && <p className="mt-1 text-xs text-red-400">Dirección no válida: debe empezar con https://</p>}
            {p && !invalid && <p className="mt-1 text-xs text-zinc-500">Servicio detectado: {p.name}</p>}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => addRow()} disabled={value.length >= MAX_LINKS} className="btn-ghost btn-sm">
          <Link2 className="h-3.5 w-3.5" /> Agregar enlace
        </button>
        {LINK_LABEL_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addRow(s)}
            disabled={value.length >= MAX_LINKS}
            className="chip hover:border-white/30 hover:text-white"
          >
            <Plus className="h-3 w-3" /> {s}
          </button>
        ))}
      </div>
    </div>
  );
}
