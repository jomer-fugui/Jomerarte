import Link from "next/link";
import QRCode from "qrcode";
import { ArrowUpRight, ExternalLink, Info, QrCode, Star } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Settings } from "@/lib/defaults";
import { fetchGoogleSummary, googleMapsUrl, googleReviewUrl, hasGoogleMapsLink } from "@/lib/reviews";
import type { GoogleSummary } from "@/lib/reviews";
import { cn } from "@/lib/format";

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-4 w-4", n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-600")}
        />
      ))}
    </span>
  );
}

/** Resumen de la ficha de Google: promedio, cantidad y últimas reseñas (máximo 5, lo que permite Google). */
function GoogleBlock({ summary }: { summary: GoogleSummary }) {
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold text-white">{summary.rating.toFixed(1)}</span>
          <span className="text-sm text-zinc-400">de 5</span>
        </div>
        <div>
          <Stars rating={summary.rating} />
          <p className="mt-1 text-sm text-zinc-400">
            {summary.total} {summary.total === 1 ? "reseña" : "reseñas"} en Google
          </p>
        </div>
        <a
          href={summary.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost btn-sm ml-auto"
        >
          Ver todas en Google <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {summary.reviews.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {summary.reviews.map((r) => (
            <article key={r.id} className="card flex flex-col gap-3 p-5">
              <header className="flex items-center gap-3">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
                    {r.author.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{r.author}</p>
                  <p className="text-xs text-zinc-500">{r.when || "Reseña de Google"}</p>
                </div>
                <Stars rating={r.rating} className="ml-auto shrink-0" />
              </header>
              {r.text && <p className="text-sm whitespace-pre-line text-zinc-300">{r.text}</p>}
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-accent-light hover:text-white"
                >
                  Ver en Google <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Reseñas publicadas en Google. Acá se muestran las más relevantes; para verlas todas, abrí la ficha en Google Maps.
      </p>
    </div>
  );
}

/**
 * Página de opiniones: invita a dejar la reseña en Google (con código QR para imprimir), muestra las
 * reseñas de Google si están configuradas y ofrece un formulario privado que llega solo al panel.
 */
export async function ReviewsView({ settings, admin, path }: { settings: Settings; admin?: boolean; path: string }) {
  const reviewUrl = googleReviewUrl(settings);
  const showMaps = hasGoogleMapsLink(settings);
  const summary = await fetchGoogleSummary(settings);
  const qrSvg = reviewUrl
    ? await QRCode.toString(reviewUrl, { type: "svg", margin: 0, width: 220, errorCorrectionLevel: "M" })
    : "";

  return (
    <div className="space-y-12">
      {reviewUrl ? (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
            <p className="eyebrow">Tu opinión me ayuda</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-wide text-white uppercase sm:text-4xl">
              Dejá tu reseña en Google
            </h2>
            <p className="mt-3 max-w-lg text-zinc-300">
              Si trabajé para vos, contale a los demás cómo te fue. Es gratis, te lleva un minuto y se publica en mi ficha
              de Google.
            </p>
            <ol className="mt-5 space-y-2 text-sm text-zinc-400">
              <li>
                <span className="mr-2 font-bold text-accent-light">1.</span> Tocá el botón de abajo.
              </li>
              <li>
                <span className="mr-2 font-bold text-accent-light">2.</span> Elegí las estrellas y escribí tu experiencia.
              </li>
              <li>
                <span className="mr-2 font-bold text-accent-light">3.</span> Necesitás una cuenta de Google (Gmail); si no
                tenés, abajo podés contarme por privado.
              </li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <Star className="h-4 w-4" /> Escribir mi reseña en Google
              </a>
              {showMaps && (
                <a href={googleMapsUrl(settings)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  Ver mi ficha en Google Maps
                </a>
              )}
            </div>
          </div>

          <div className="card flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <QrCode className="h-4 w-4 text-accent-light" /> Escaneá y dejá tu reseña
            </p>
            <div
              className="w-[220px] max-w-full rounded-xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
              // El SVG lo genera la librería QR con el enlace de reseña configurado en el panel
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-xs text-zinc-500">
              Ideal para pegar en el taller o mostrarlo desde el celular.
            </p>
            <a href="/api/qr" download className="btn-ghost btn-sm">
              Descargar el código QR
            </a>
          </div>
        </section>
      ) : (
        <section className="card p-6">
          <h2 className="font-display text-2xl font-bold text-white uppercase">Opiniones</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            ¿Trabajé para vos? Contame cómo te fue con el formulario de abajo. Tu mensaje me llega a mí.
          </p>
        </section>
      )}

      {summary ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">Lo que dicen en Google</h2>
          <GoogleBlock summary={summary} />
        </section>
      ) : null}

      <section id="contanos" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
            ¿No tenés cuenta de Google? Contame por privado
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Escribime cómo te pareció el servicio. Este mensaje no se publica: queda entre vos y yo, y me sirve para
            mejorar.
          </p>
        </div>
        <FeedbackForm reviewUrl={reviewUrl} origin={path} siteName={settings.siteName} />
      </section>

      {admin && !reviewUrl && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          Falta cargar el enlace de “Pedir reseñas” de Google.{" "}
          <Link href="/admin/ajustes#opiniones" className="font-semibold underline">
            Cargarlo en Ajustes → Opiniones
          </Link>
          . Así la página muestra el botón y el código QR.
        </p>
      )}
    </div>
  );
}
