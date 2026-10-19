"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-brand text-6xl text-accent text-glow">¡Ups!</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-white uppercase">Algo hizo cortocircuito</h1>
        <p className="mx-auto mt-2 max-w-md text-zinc-400">
          No se pudo cargar esta página. Puede ser un problema momentáneo con la base de datos: intenta de nuevo en unos
          segundos.
        </p>
        {error.digest && <p className="mt-2 text-xs text-zinc-600">Código: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={() => unstable_retry()} className="btn-primary">
            <RotateCcw className="h-4 w-4" /> Reintentar
          </button>
          <Link href="/" className="btn-ghost">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
