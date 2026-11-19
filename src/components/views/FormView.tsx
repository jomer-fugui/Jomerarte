import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getServiceNames, type Item } from "@/lib/data";
import { cleanFormConfig } from "@/lib/form-fields";
import type { SectionDef } from "@/lib/sections";
import { PublicForm, type RenderField } from "../PublicForm";

/**
 * Página de tipo “Formulario”: arma los campos guardados en el panel (resolviendo los desplegables
 * de servicios) y muestra el formulario público.
 */
export async function FormView({
  page,
  section,
  admin,
}: {
  /** Registro de la página creada desde el panel (tiene la definición en `form`) */
  page: Item;
  section: SectionDef;
  admin?: boolean;
}) {
  const config = cleanFormConfig(page.form);
  const usesServices = config.fields.some((f) => f.type === "select" && f.optionsSource === "services");
  const services = usesServices ? await getServiceNames(page.site) : [];

  const fields: RenderField[] = config.fields.map((f) => ({
    ...f,
    options: f.type === "select" ? (f.optionsSource === "services" ? services : f.options) : [],
  }));

  if (fields.length === 0) {
    return (
      <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
        <ClipboardList className="h-10 w-10 text-zinc-600" />
        <p className="font-display text-xl font-bold text-white uppercase">El formulario todavía no tiene campos</p>
        <p className="max-w-md text-sm text-zinc-400">
          Agregá los campos que quieras pedir (nombre, contacto, servicio, mensaje…) y aparecen acá al instante.
        </p>
        {admin ? (
          <Link href={`/admin/s/custom/${page.id}`} className="btn-primary mt-1">
            Configurar el formulario
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <PublicForm
      formId={page.id}
      fields={fields}
      submitLabel={config.submitLabel}
      successTitle={config.successTitle}
      successMessage={config.successMessage}
      origin={section.path}
    />
  );
}
