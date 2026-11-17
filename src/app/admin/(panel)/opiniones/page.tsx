import Link from "next/link";
import { Check, ExternalLink, Mail, MessageCircle, Settings2, Star, Trash2 } from "lucide-react";
import { listFeedback, countUnreadFeedback } from "@/lib/feedback";
import { getCurrentSite } from "@/lib/site";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/client";
import { deleteFeedbackAction, toggleFeedbackReadAction } from "../../actions";

export const dynamic = "force-dynamic";

/** Comentarios privados que dejan los visitantes en la página de opiniones. */
export default async function OpinionesPage() {
  const site = await getCurrentSite();
  const [rows, unread] = await Promise.all([listFeedback(site.slug), countUnreadFeedback(site.slug)]);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Opiniones</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white uppercase">Opiniones</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Los mensajes que la gente deja en la página de opiniones. Son <strong className="text-zinc-300">privados</strong>:
            no se publican en el sitio, quedan acá para que los leas y puedas responder. Las reseñas públicas se escriben en tu
            ficha de Google.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/Opiniones" target="_blank" className="btn-ghost">
            <ExternalLink className="h-4 w-4" /> Ver la página
          </Link>
          <Link href="/admin/ajustes#opiniones" className="btn-primary">
            <Settings2 className="h-4 w-4" /> Configurar Google
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-400">
        {rows.length === 0
          ? "Todavía no hay comentarios."
          : `${rows.length} ${rows.length === 1 ? "comentario" : "comentarios"}`}
        {unread > 0 && <span className="ml-2 chip-active chip">{unread} sin leer</span>}
      </p>

      {rows.length === 0 ? (
        <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
          <Star className="h-10 w-10 text-zinc-600" />
          <p className="font-display text-xl font-bold text-white uppercase">Todavía no hay comentarios</p>
          <p className="max-w-md text-sm text-zinc-400">
            Cuando alguien use el formulario de la página de opiniones, el mensaje aparece acá. Mientras tanto, invitá a tus
            clientes a dejar la reseña en Google: la página ya tiene el botón y el código QR.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((f) => (
            <article key={f.id} className={f.read ? "card p-5" : "card border-accent/40 p-5"}>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-semibold text-white">{f.name || "Anónimo"}</span>
                {f.rating > 0 && (
                  <span className="inline-flex items-center gap-0.5" aria-label={`${f.rating} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          n <= f.rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-zinc-600"
                        }
                      />
                    ))}
                  </span>
                )}
                {!f.read && <span className="chip chip-active">Nuevo</span>}
                <span className="ml-auto text-xs text-zinc-500">{formatDate(f.createdAt)}</span>
              </header>

              <p className="mt-3 text-sm whitespace-pre-line text-zinc-300">{f.message}</p>

              <footer className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-xs text-zinc-500">
                {f.contact ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <a
                      href={f.contact.includes("@") ? `mailto:${f.contact}` : f.contact}
                      className="text-accent-light hover:text-white"
                      target={f.contact.includes("@") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                    >
                      {f.contact}
                    </a>
                  </span>
                ) : (
                  <span>Sin datos de contacto</span>
                )}
                {f.origin && (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" /> desde {f.origin}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <form action={toggleFeedbackReadAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="btn-ghost btn-sm">
                      <Check className="h-3.5 w-3.5" /> {f.read ? "Marcar como nuevo" : "Marcar como leído"}
                    </button>
                  </form>
                  <form action={deleteFeedbackAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmButton
                      message="¿Borrar este comentario? No se puede deshacer."
                      className="btn-danger btn-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Borrar
                    </ConfirmButton>
                  </form>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
