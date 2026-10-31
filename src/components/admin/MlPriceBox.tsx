"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Loader2, RefreshCw, Unlink } from "lucide-react";
import {
  formatMoney,
  isMlShortLink,
  isMlUrl,
  mlRefLabel,
  mlStatusLabel,
  parseMlRef,
  type MlInfo,
  type MlRef,
} from "@/lib/ml-ref";
import { formatDate } from "@/lib/format";

export type MlValues = { mlRef: string; mlId: string; mlType: string; mlSync: boolean };

type Lookup = {
  ok: boolean;
  message: string;
  connected?: boolean;
  ref?: MlRef;
  title?: string;
  formatted?: string;
  original?: number | null;
  currency?: string;
  status?: string;
};

/** El código que se va a guardar: el escrito en el recuadro, el ya vinculado o el que trae el link largo. */
export function resolveMlRef(value: MlValues, linkUrl: string): MlRef | null {
  const typed = parseMlRef(value.mlRef);
  if (typed) return typed;
  if (value.mlId && (value.mlType === "item" || value.mlType === "product")) return { id: value.mlId, type: value.mlType };
  return isMlUrl(linkUrl) ? parseMlRef(linkUrl) : null;
}

/** Recuadro “Precio automático de Mercado Libre” del formulario de cada producto. */
export function MlPriceBox({
  value,
  onChange,
  onPrice,
  linkUrl,
  connected,
  info,
  savedId,
  related,
}: {
  value: MlValues;
  onChange: (v: MlValues) => void;
  onPrice: (price: string) => void;
  linkUrl: string;
  connected: boolean;
  info: MlInfo | null;
  savedId: string;
  related: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Lookup | null>(null);
  const open = manualOpen ?? related;
  const ref = resolveMlRef(value, linkUrl);
  const shortLink = !ref && (isMlShortLink(linkUrl) || isMlShortLink(value.mlRef));
  const showSaved = Boolean(info?.checkedAt) && ref?.id === savedId;

  async function detect() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/mercadolibre/lookup?ref=${encodeURIComponent(value.mlRef)}&link=${encodeURIComponent(linkUrl)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as Lookup;
      setResult(data);
      if (data.ref) {
        onChange({ ...value, mlId: data.ref.id, mlType: data.ref.type, mlSync: true });
        if (data.formatted) onPrice(data.formatted);
      }
    } catch {
      setResult({ ok: false, message: "No se pudo consultar. Revisa tu conexión e intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      open={open}
      onToggle={(e) => setManualOpen(e.currentTarget.open)}
      className="rounded-xl border border-[#FFE600]/30 bg-[#FFE600]/[0.04] p-4"
    >
      <summary className="flex cursor-pointer items-center gap-2 font-semibold text-white">
        <span className="rounded bg-[#FFE600] px-1.5 py-0.5 text-[10px] font-extrabold text-[#2D3277]">ML</span>
        Precio automático de Mercado Libre
        <span className="ml-auto text-xs font-normal">
          {ref && value.mlSync ? <span className="text-emerald-300">Activado</span> : <span className="text-zinc-500">Opcional</span>}
        </span>
      </summary>

      <div className="mt-4 space-y-4">
        <p className="text-xs text-zinc-400">
          Tu link de afiliado <strong className="text-zinc-200">no se modifica</strong>: el botón de compra sigue usando tu
          link. Solo se actualiza el precio que se muestra, una vez por día o cada 2 días.
        </p>

        <div>
          <label className="label" htmlFor="ml-ref">
            Código o enlace normal del producto
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="ml-ref"
              value={value.mlRef}
              onChange={(e) => onChange({ ...value, mlRef: e.target.value, mlId: "", mlType: "" })}
              placeholder="https://www.mercadolibre.com.ar/…/p/MLA12345678  ·  MLA12345678"
              className="input"
              autoComplete="off"
            />
            <button type="button" onClick={detect} disabled={busy || (!value.mlRef && !linkUrl)} className="btn-ghost shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Detectar y traer precio
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Si tu link de afiliado es largo, el código se detecta solo. Si es corto (meli.la o /sec/), abre el producto en el
            navegador y pega aquí ese enlace. Funcionan mejor los enlaces de “página de producto” (con /p/).
          </p>
        </div>

        {ref ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CircleCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-200">Vinculado a {mlRefLabel(ref)}</span>
            <button
              type="button"
              onClick={() => onChange({ mlRef: "", mlId: "", mlType: "", mlSync: false })}
              className="ml-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-300"
            >
              <Unlink className="h-3.5 w-3.5" /> Quitar
            </button>
          </div>
        ) : shortLink ? (
          <p className="flex items-start gap-2 text-sm text-amber-300">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Tu link de afiliado es corto: pulsa “Detectar” o pega el enlace
            normal del producto.
          </p>
        ) : null}

        {result && (
          <div className={result.ok ? "text-sm text-emerald-300" : "text-sm text-red-300"}>
            <p>{result.message}</p>
            {result.title && <p className="text-zinc-300">{result.title}</p>}
            {result.formatted && (
              <p className="font-semibold text-white">
                {result.formatted}
                {typeof result.original === "number" && result.original > 0 && (
                  <span className="ml-2 font-normal text-zinc-500 line-through">
                    {formatMoney(result.original, result.currency)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {showSaved && info && (
          <p className="text-xs text-zinc-500">
            Última revisión: {formatDate(info.checkedAt ?? "")}
            {info.error ? <span className="text-red-300"> · {info.error}</span> : null}
            {!info.error && mlStatusLabel(info) ? <span className="text-amber-300"> · {mlStatusLabel(info)}</span> : null}
          </p>
        )}

        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={Boolean(ref) && value.mlSync}
            disabled={!ref}
            onChange={(e) => onChange({ ...value, mlSync: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Actualizar este precio automáticamente
        </label>

        {!connected && (
          <p className="text-xs text-amber-300">
            Falta conectar tu cuenta de Mercado Libre:{" "}
            <Link href="/admin/mercadolibre" className="underline">
              configurar ahora
            </Link>
            . El código se guarda igual y el precio empieza a actualizarse cuando la conectes.
          </p>
        )}
      </div>
    </details>
  );
}
