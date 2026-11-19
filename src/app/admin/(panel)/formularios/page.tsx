import Link from "next/link";
import { Check, ClipboardList, ExternalLink, Mail, MessageSquare, Trash2 } from "lucide-react";
import { getCustomSections, type CustomSection } from "@/lib/data";
import { answersSummary, readAnswers } from "@/lib/form-fields";
import { countUnreadSubmissions, listSubmissions } from "@/lib/forms";
import { formatDate } from "@/lib/format";
import { getCurrentSite } from "@/lib/site";
import { ConfirmButton } from "@/components/client";
import { deleteSubmissionAction, toggleSubmissionReadAction } from "../../actions";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Páginas de tipo “Formulario” del sitio que se está editando. */
function formPages(customs: CustomSection[]): CustomSection[] {
  return customs.filter((c) => c.type.key === "form");
}

export default async function FormulariosPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const [site, sp] = await Promise.all([getCurrentSite(), searchParams]);
  const customs = await getCustomSections();
  const forms = formPages(customs);
  const selected = sp.f ? forms.find((f) => f.key === sp.f) : undefined;
  const [rows, unread] = await Promise.all([
    listSubmissions(site.slug, selected?.item.id),
    countUnreadSubmissions(site.slug, selected?.item.id),
  ]);
  const titleById = new Map(forms.map((f) => [f.item.id, f] as const));
  const redirectTo = selected ? `/admin/formularios?f=${selected.key}` : "/admin/formularios";
  const totalUnread = await countUnreadSubmissions(site.slug);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Formularios</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white uppercase">Formularios</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Todo lo que la gente completa en tus páginas de tipo <strong className="text-zinc-300">Formulario</strong>. Son{" "}
            <strong className="text-zinc-300">privados</strong>: no se publican en el sitio, quedan acá para que los leas y
            respondas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/s/custom/nuevo" className="btn-ghost">
            <ClipboardList className="h-4 w-4" /> Crear página con formulario
          </Link>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
          <ClipboardList className="h-10 w-10 text-zinc-600" />
          <p className="font-display text-xl font-bold text-white uppercase">Todavía no hay formularios</p>
          <p className="max-w-md text-sm text-zinc-400">
            Creá una página nueva y elegí el tipo <strong className="text-zinc-200">Formulario</strong>: ahí decides qué
            campos pedir (nombre, contacto, un desplegable con tus servicios, un mensaje…) y todo lo que envíen aparece en
            esta pantalla.
          </p>
          <Link href="/admin/s/custom/nuevo" className="btn-primary mt-1">
            Crear una página con formulario
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/formularios" className={selected ? "chip" : "chip chip-active"}>
              Todos{totalUnread > 0 ? ` (${totalUnread} sin leer)` : ""}
            </Link>
            {forms.map((f) => (
              <Link
                key={f.key}
                href={`/admin/formularios?f=${f.key}`}
                className={selected?.key === f.key ? "chip chip-active" : "chip"}
              >
                {f.item.title || f.item.slug}
              </Link>
            ))}
          </div>

          <p className="text-sm text-zinc-400">
            {rows.length === 0
              ? "Todavía no hay respuestas."
              : `${rows.length} ${rows.length === 1 ? "respuesta" : "respuestas"}`}
            {unread > 0 && <span className="chip chip-active ml-2">{unread} sin leer</span>}
          </p>

          {rows.length === 0 ? (
            <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
              <MessageSquare className="h-10 w-10 text-zinc-600" />
              <p className="font-display text-xl font-bold text-white uppercase">Sin respuestas por ahora</p>
              <p className="max-w-md text-sm text-zinc-400">
                Cuando alguien complete {selected ? `“${selected.item.title}”` : "un formulario"}, el envío aparece acá con
                la fecha y todos los datos.
              </p>
              {selected && (
                <Link href={selected.path} target="_blank" className="btn-ghost mt-1">
                  <ExternalLink className="h-4 w-4" /> Ver el formulario en el sitio
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const answers = readAnswers(row.answers);
                const email = answers.find((a) => EMAIL.test(a.value))?.value;
                const form = titleById.get(row.formId);
                return (
                  <article key={row.id} className={row.read ? "card p-5" : "card border-accent/40 p-5"}>
                    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-semibold text-white">
                        {answers[0]?.value || form?.item.title || "Respuesta"}
                      </span>
                      {!row.read && <span className="chip chip-active">Nueva</span>}
                      {form && <span className="chip">{form.item.title || form.item.slug}</span>}
                      <span className="ml-auto text-xs text-zinc-500">{formatDate(row.createdAt)}</span>
                    </header>

                    <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {answers.map((a) => (
                        <div key={`${row.id}-${a.label}`} className="min-w-0">
                          <dt className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">{a.label}</dt>
                          <dd className="text-sm break-words whitespace-pre-line text-zinc-200">{a.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <footer className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-xs text-zinc-500">
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex items-center gap-1.5 text-accent-light hover:text-white"
                        >
                          <Mail className="h-3.5 w-3.5" /> {email}
                        </a>
                      ) : (
                        <span>{answersSummary(answers)}</span>
                      )}
                      {row.page && <span className="inline-flex items-center gap-1.5">desde {row.page}</span>}
                      <div className="ml-auto flex items-center gap-2">
                        <form action={toggleSubmissionReadAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <button type="submit" className="btn-ghost btn-sm">
                            <Check className="h-3.5 w-3.5" /> {row.read ? "Marcar como nueva" : "Marcar como leída"}
                          </button>
                        </form>
                        <form action={deleteSubmissionAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="redirectTo" value={redirectTo} />
                          <ConfirmButton message="¿Borrar esta respuesta? No se puede deshacer." className="btn-danger btn-sm">
                            <Trash2 className="h-3.5 w-3.5" /> Borrar
                          </ConfirmButton>
                        </form>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
