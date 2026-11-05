"use client";

/** Lista desplegable que guarda apenas se elige una opción (sin botón “Guardar”). */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  label,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      aria-label={label}
      title={label}
      className={className}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
