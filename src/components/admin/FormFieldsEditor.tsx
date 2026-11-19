"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  FORM_FIELD_TYPES,
  blankField,
  nextFieldId,
  type FormConfig,
  type FormField,
  type FormFieldType,
} from "@/lib/form-fields";
import { cn } from "@/lib/format";

/**
 * Editor de los campos de una página de tipo “Formulario”.
 * Todo se arma acá: etiqueta, tipo, si es obligatorio, opciones del desplegable y los mensajes
 * que ve la persona cuando envía. Se guarda como JSON junto con la página.
 */
export function FormFieldsEditor({ value, onChange }: { value: FormConfig; onChange: (next: FormConfig) => void }) {
  const [newType, setNewType] = useState<FormFieldType>("text");
  const fields = value.fields;

  const setFields = (next: FormField[]) => onChange({ ...value, fields: next });

  function patch(index: number, part: Partial<FormField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...part } : f)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  function remove(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function add() {
    const field = { ...blankField(nextFieldId(fields)), type: newType };
    if (newType === "select") field.allowOther = true;
    setFields([...fields, field]);
  }

  return (
    <div className="space-y-5">
      {fields.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
          Todavía no hay campos. Agregá el primero: por ejemplo “Tu nombre”, “Email o WhatsApp”, un desplegable con tus
          servicios y un texto largo para el mensaje.
        </p>
      )}

      {fields.map((field, i) => (
        <div key={field.id} className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm font-semibold text-white">{field.label || "Campo sin nombre"}</p>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Subir campo"
                className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === fields.length - 1}
                aria-label="Bajar campo"
                className="rounded p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Quitar campo"
                className="rounded p-1.5 text-red-300 hover:bg-red-500/15 hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`cf-label-${field.id}`}>
                Texto que se muestra arriba del campo
              </label>
              <input
                id={`cf-label-${field.id}`}
                value={field.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                maxLength={90}
                placeholder="Ej: ¿Qué servicio necesitás?"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor={`cf-type-${field.id}`}>
                Tipo de campo
              </label>
              <select
                id={`cf-type-${field.id}`}
                value={field.type}
                onChange={(e) => patch(i, { type: e.target.value as FormFieldType })}
                className="input"
              >
                {FORM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2.5 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => patch(i, { required: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Es obligatorio
              </label>
            </div>
            <div>
              <label className="label" htmlFor={`cf-ph-${field.id}`}>
                Texto de ayuda dentro del campo (opcional)
              </label>
              <input
                id={`cf-ph-${field.id}`}
                value={field.placeholder}
                onChange={(e) => patch(i, { placeholder: e.target.value })}
                maxLength={120}
                placeholder="Ej: Tu nombre y apellido"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor={`cf-help-${field.id}`}>
                Aclaración debajo del campo (opcional)
              </label>
              <input
                id={`cf-help-${field.id}`}
                value={field.help}
                onChange={(e) => patch(i, { help: e.target.value })}
                maxLength={180}
                placeholder="Ej: Solo si querés que te llame"
                className="input"
              />
            </div>
          </div>

          {field.type === "select" && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <span className="label">Opciones del desplegable</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => patch(i, { optionsSource: "services" })}
                  aria-pressed={field.optionsSource === "services"}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition",
                    field.optionsSource === "services"
                      ? "border-accent bg-accent/15 text-white"
                      : "border-white/10 text-zinc-300 hover:border-white/30",
                  )}
                >
                  <strong className="block">Servicios del sitio</strong>
                  <span className="text-xs text-zinc-400">Se completan solos con lo que cargues en Servicios</span>
                </button>
                <button
                  type="button"
                  onClick={() => patch(i, { optionsSource: "custom" })}
                  aria-pressed={field.optionsSource === "custom"}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition",
                    field.optionsSource === "custom"
                      ? "border-accent bg-accent/15 text-white"
                      : "border-white/10 text-zinc-300 hover:border-white/30",
                  )}
                >
                  <strong className="block">Lista propia</strong>
                  <span className="text-xs text-zinc-400">Escribís las opciones a mano, una por línea</span>
                </button>
              </div>

              {field.optionsSource === "custom" && (
                <div>
                  <label className="label" htmlFor={`cf-opts-${field.id}`}>
                    Opciones (una por línea)
                  </label>
                  <textarea
                    id={`cf-opts-${field.id}`}
                    rows={4}
                    value={field.options.join("\n")}
                    onChange={(e) =>
                      patch(i, {
                        options: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder={"Instalación eléctrica\nCámaras de seguridad\nPáginas web"}
                    className="input"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={field.allowOther}
                  onChange={(e) => patch(i, { allowOther: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Agregar la opción “Otro (especificar)” con un campo para escribir
              </label>

              {field.optionsSource === "services" && (
                <p className="text-xs text-zinc-500">
                  Las opciones salen de la página Servicios de este mismo sitio. Si todavía no cargaste ninguno, el
                  desplegable va a estar vacío hasta que lo hagas.
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="cf-new-type">
            Agregar un campo
          </label>
          <select
            id="cf-new-type"
            value={newType}
            onChange={(e) => setNewType(e.target.value as FormFieldType)}
            className="input"
          >
            {FORM_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={add} className="btn-ghost">
          <Plus className="h-4 w-4" /> Agregar campo
        </button>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="font-display text-sm font-bold tracking-wide text-white uppercase">Cuando alguien envía</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cf-submit">
              Texto del botón
            </label>
            <input
              id="cf-submit"
              value={value.submitLabel}
              onChange={(e) => onChange({ ...value, submitLabel: e.target.value })}
              maxLength={40}
              placeholder="Enviar"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="cf-stitle">
              Título del mensaje de gracias
            </label>
            <input
              id="cf-stitle"
              value={value.successTitle}
              onChange={(e) => onChange({ ...value, successTitle: e.target.value })}
              maxLength={90}
              placeholder="¡Gracias por escribirme!"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cf-smsg">
            Mensaje de gracias
          </label>
          <textarea
            id="cf-smsg"
            rows={3}
            value={value.successMessage}
            onChange={(e) => onChange({ ...value, successMessage: e.target.value })}
            maxLength={400}
            placeholder="Recibí tu mensaje y te respondo a la brevedad."
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
