/**
 * Formularios hechos desde el panel.
 *
 * Una página de tipo “Formulario” guarda su definición en la columna `form` de su propio
 * registro de `items`. Las respuestas van a `form_submissions` y se leen solo en el panel.
 */

export type FormFieldType = "text" | "textarea" | "email" | "tel" | "select" | "date";

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string; hint: string }[] = [
  { value: "text", label: "Texto corto", hint: "Una línea: nombre, ciudad, cantidad…" },
  { value: "textarea", label: "Texto largo", hint: "Varias líneas: el mensaje o el detalle" },
  { value: "email", label: "Email", hint: "Se controla que tenga formato de correo" },
  { value: "tel", label: "Teléfono", hint: "Número de teléfono o WhatsApp" },
  { value: "select", label: "Desplegable", hint: "Elegir una opción de una lista" },
  { value: "date", label: "Fecha", hint: "Calendario para elegir un día" },
];

export type FormField = {
  /** Identificador estable: se usa como nombre del campo en el envío */
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string;
  /** Aclaración chica debajo del campo */
  help: string;
  /** Solo desplegable: de dónde salen las opciones */
  optionsSource: "services" | "custom";
  /** Solo desplegable con lista propia */
  options: string[];
  /** Solo desplegable: agrega la opción “Otro (especificar)” con un campo de texto */
  allowOther: boolean;
};

export type FormConfig = {
  fields: FormField[];
  submitLabel: string;
  successTitle: string;
  successMessage: string;
};

export type FormAnswer = { label: string; value: string };

export const EMPTY_FORM_CONFIG: FormConfig = {
  fields: [],
  submitLabel: "Enviar",
  successTitle: "¡Gracias por escribirme!",
  successMessage: "Recibí tu mensaje y te respondo a la brevedad.",
};

/** Formulario sugerido al elegir el tipo “Formulario” por primera vez. */
export function defaultFormConfig(): FormConfig {
  return {
    ...EMPTY_FORM_CONFIG,
    fields: [
      { ...blankField("f1"), label: "Tu nombre", type: "text", required: true, placeholder: "Ej: Martín" },
      {
        ...blankField("f2"),
        label: "Email o WhatsApp",
        type: "text",
        required: true,
        placeholder: "Para poder responderte",
      },
      {
        ...blankField("f3"),
        label: "¿Qué servicio necesitás?",
        type: "select",
        optionsSource: "services",
        allowOther: true,
      },
      {
        ...blankField("f4"),
        label: "Contame qué necesitás",
        type: "textarea",
        placeholder: "Detalle del trabajo, dirección, medidas…",
      },
    ],
  };
}

export function blankField(id: string): FormField {
  return {
    id,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    help: "",
    optionsSource: "services",
    options: [],
    allowOther: false,
  };
}

/** Próximo identificador libre (f1, f2, …). */
export function nextFieldId(fields: FormField[]): string {
  let n = fields.length + 1;
  const used = new Set(fields.map((f) => f.id));
  while (used.has(`f${n}`)) n += 1;
  return `f${n}`;
}

const MAX_FIELDS = 24;
const MAX_OPTIONS = 60;
const TYPES: readonly string[] = FORM_FIELD_TYPES.map((t) => t.value);

function text(value: unknown, max: number): string {
  return (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, max);
}

function longText(value: unknown, max: number): string {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

function cleanOptions(raw: unknown): string[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const item of list) {
    const value = text(item, 80);
    if (!value) continue;
    if (!out.some((o) => o.toLowerCase() === value.toLowerCase())) out.push(value);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

/**
 * Normaliza lo que llega del panel (o de la base): descarta campos vacíos, ordena los
 * identificadores y deja valores por defecto sanos. Nunca falla.
 */
export function cleanFormConfig(raw: unknown): FormConfig {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawFields: unknown[] = Array.isArray(src.fields) ? src.fields : [];
  const fields: FormField[] = [];
  const used = new Set<string>();

  for (const item of rawFields) {
    const f = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const label = text(f.label, 90);
    if (!label) continue;
    let id = text(f.id, 24).replace(/[^A-Za-z0-9_-]/g, "");
    if (!id || used.has(id)) id = nextFieldId(fields);
    used.add(id);
    const type = TYPES.includes(text(f.type, 20)) ? (text(f.type, 20) as FormFieldType) : "text";
    fields.push({
      id,
      label,
      type,
      required: f.required === true,
      placeholder: text(f.placeholder, 120),
      help: text(f.help, 180),
      optionsSource: f.optionsSource === "custom" ? "custom" : "services",
      options: cleanOptions(f.options),
      allowOther: f.allowOther === true,
    });
    if (fields.length >= MAX_FIELDS) break;
  }

  return {
    fields,
    submitLabel: text(src.submitLabel, 40) || EMPTY_FORM_CONFIG.submitLabel,
    successTitle: text(src.successTitle, 90) || EMPTY_FORM_CONFIG.successTitle,
    successMessage: longText(src.successMessage, 400) || EMPTY_FORM_CONFIG.successMessage,
  };
}

/** Resumen corto de una respuesta: sirve para la lista del panel. */
export function answersSummary(answers: FormAnswer[]): string {
  return answers
    .slice(0, 3)
    .map((a) => `${a.label}: ${a.value}`)
    .join(" · ");
}

/** Las respuestas guardadas pueden venir de una versión anterior: siempre se leen como lista. */
export function readAnswers(raw: unknown): FormAnswer[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  const out: FormAnswer[] = [];
  for (const item of list) {
    const a = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const label = text(a.label, 90);
    const value = longText(a.value, 4000);
    if (label && value) out.push({ label, value });
  }
  return out;
}
