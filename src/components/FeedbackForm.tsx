"use client";

import { useActionState, useState } from "react";
import { Check, Send, Star } from "lucide-react";
import { sendFeedbackAction, type FeedbackState } from "@/app/actions";
import { cn } from "@/lib/format";

/**
 * Formulario de opinión privada: el visitante cuenta cómo le fue y el mensaje queda solo en el panel
 * (no se publica). Las reseñas públicas se siguen escribiendo en Google.
 */
export function FeedbackForm({
  reviewUrl,
  origin,
  siteName,
}: {
  reviewUrl: string;
  origin: string;
  siteName: string;
}) {
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(sendFeedbackAction, null);
  const [rating, setRating] = useState(0);

  if (state?.ok) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-6 w-6" />
        </span>
        <p className="font-display text-xl font-bold text-white uppercase">¡Gracias por escribirme!</p>
        <p className="text-sm text-zinc-400">
          Recibí tu mensaje y lo voy a leer con atención. Si te quedó algo pendiente, escribime por WhatsApp y lo resolvemos.
        </p>
        {reviewUrl && (
          <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-1">
            <Star className="h-4 w-4" /> Dejar también mi reseña en Google
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <input type="hidden" name="origin" value={origin} />
      <input type="hidden" name="rating" value={rating} />
      {/* Trampa para robots: invisible para las personas */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">No completar</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{state.error}</p>
      )}

      <div>
        <p className="label mb-2">¿Cómo te pareció el servicio?</p>
        <div className="flex items-center gap-1.5" role="group" aria-label="Puntaje de 1 a 5 estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n === rating ? 0 : n)}
              aria-pressed={rating >= n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              className="rounded-lg p-1 transition hover:bg-white/5"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition",
                  rating >= n ? "fill-amber-400 text-amber-400" : "text-zinc-600 hover:text-zinc-400",
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-zinc-500">{rating > 0 ? `${rating} de 5` : "opcional"}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="feedback-name">
            Tu nombre <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input id="feedback-name" name="name" maxLength={80} className="input" placeholder="Ej: Martín" />
        </div>
        <div>
          <label className="label" htmlFor="feedback-contact">
            Email o WhatsApp <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input
            id="feedback-contact"
            name="contact"
            maxLength={120}
            className="input"
            placeholder="Para poder responderte"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="feedback-message">
          Contame cómo te fue
        </label>
        <textarea
          id="feedback-message"
          name="message"
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          className="input"
          placeholder="Qué trabajo te hice, si quedaste conforme, qué puedo mejorar…"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Este mensaje me llega solo a mí, no se publica en el sitio. Para que lo vea todo el mundo, dejá tu reseña en Google
          {reviewUrl ? " con el botón de arriba" : ""}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <Send className="h-4 w-4" /> {pending ? "Enviando…" : "Enviar mi opinión"}
        </button>
        <span className="text-xs text-zinc-500">Gracias por tomarte el tiempo. {siteName} lo lee todo.</span>
      </div>
    </form>
  );
}
