"use client";

import { useActionState, useState } from "react";
import { Check, Send } from "lucide-react";
import { submitFormAction, type FormSubmitState } from "@/app/actions";
import type { FormField } from "@/lib/form-fields";

/** Campo listo para mostrar: el desplegable ya trae sus opciones resueltas. */
export type RenderField = FormField & { options: string[] };

const OTHER = "__otro";

function inputType(type: FormField["type"]): string {
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  if (type === "date") return "date";
  return "text";
}

/**
 * Formulario público de una página de tipo “Formulario”.
 * El envío va a una acción del servidor: nada se publica, todo queda en el panel.
 */
export function PublicForm({
  formId,
  fields,
  submitLabel,
  successTitle,
  successMessage,
  origin,
  note,
}: {
  formId: number;
  fields: RenderField[];
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  /** Dirección de la página, para saber desde dónde se envió */
  origin: string;
  /** Texto chico al pie (ej: qué se hace con los datos) */
  note?: string;
}) {
  const [state, formAction, pending] = useActionState<FormSubmitState, FormData>(submitFormAction, null);
  const [other, setOther] = useState<Record<string, string>>({});

  if (state?.ok) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-6 w-6" />
        </span>
        <p className="font-display text-2xl font-bold text-white uppercase">{successTitle}</p>
        <p className="max-w-xl text-sm whitespace-pre-line text-zinc-400">{successMessage}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-6 sm:p-8">
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="origin" value={origin} />
      {/* Trampa para robots: invisible para las personas */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">No completar</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{state.error}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `f_${field.id}`;
          const wide = field.type === "textarea" || field.type === "select";
          const required = field.required;
          return (
            <div key={field.id} className={wide ? "sm:col-span-2" : undefined}>
              <label className="label" htmlFor={id}>
                {field.label}
                {!required && <span className="ml-1 font-normal text-zinc-500">(opcional)</span>}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  id={id}
                  name={id}
                  rows={5}
                  required={required}
                  maxLength={3000}
                  placeholder={field.placeholder || undefined}
                  className="input"
                />
              ) : field.type === "select" ? (
                <select
                  id={id}
                  name={id}
                  required={required}
                  defaultValue=""
                  onChange={(e) => setOther((p) => ({ ...p, [field.id]: e.target.value }))}
                  className="input"
                >
                  <option value="">{field.placeholder || "Elegí una opción"}</option>
                  {field.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  {field.allowOther && <option value={OTHER}>Otro (especificar)</option>}
                </select>
              ) : (
                <input
                  id={id}
                  name={id}
                  type={inputType(field.type)}
                  required={required}
                  maxLength={200}
                  placeholder={field.placeholder || undefined}
                  autoComplete={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "off"}
                  className="input"
                />
              )}

              {field.type === "select" && field.allowOther && other[field.id] === OTHER && (
                <input
                  name={`${id}__otro`}
                  maxLength={200}
                  required={required}
                  placeholder="Escribí cuál"
                  aria-label={`${field.label}: otro`}
                  className="input mt-2"
                />
              )}

              {field.help && <p className="mt-1.5 text-xs text-zinc-500">{field.help}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <Send className="h-4 w-4" /> {pending ? "Enviando…" : submitLabel}
        </button>
        <span className="text-xs text-zinc-500">
          {note || "Los datos llegan solo al dueño del sitio: no se publican."}
        </span>
      </div>
    </form>
  );
}
