"use client";

import { useEffect, useState } from "react";
import { AdminFab } from "./ui";

/**
 * Botón flotante “Editar” para el administrador.
 *
 * El sitio público se guarda en caché y por eso ya no puede saber en el servidor quién está
 * conectado; este componente se lo pregunta al navegador y, si no hay sesión, no muestra nada.
 */
export function AdminTools({ href, label }: { href: string; label?: string }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/whoami", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d: { admin?: boolean }) => {
        if (alive) setAdmin(Boolean(d?.admin));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return admin ? <AdminFab href={href} label={label} /> : null;
}
