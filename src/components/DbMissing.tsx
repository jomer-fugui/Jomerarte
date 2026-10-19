import { Database } from "lucide-react";
import { LogoMark } from "./Logo";

/** Se muestra cuando el sitio está publicado pero todavía no tiene base de datos conectada. */
export function DbMissing({ admin = false }: { admin?: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <LogoMark className="mx-auto h-28 w-28" idPrefix="dbm" />
        <p className="mt-5 text-center font-brand text-2xl tracking-[0.2em] text-white">JOMERARTE</p>
        <div className="card mt-8 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-light">
              <Database className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl leading-tight font-bold text-white uppercase">Falta conectar la base de datos</h1>
          </div>
          <p className="mt-4 text-zinc-300">
            El sitio se publicó bien, pero todavía no tiene una base de datos PostgreSQL donde guardar el contenido. Se
            soluciona en 2 minutos desde Vercel:
          </p>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-zinc-300">
            <li>
              En <strong className="text-white">vercel.com</strong>, abre tu proyecto y entra en la pestaña{" "}
              <strong className="text-white">Storage</strong>.
            </li>
            <li>
              Pulsa <strong className="text-white">Create Database</strong>, elige{" "}
              <strong className="text-white">Neon</strong> (Postgres, tiene plan gratuito) y créala.
            </li>
            <li>
              Conéctala al proyecto marcando <strong className="text-white">Production</strong>,{" "}
              <strong className="text-white">Preview</strong> y <strong className="text-white">Development</strong>. Vercel
              agrega sola la variable <code className="rounded bg-black/50 px-1.5 py-0.5 text-accent-light">DATABASE_URL</code>.
            </li>
            <li>
              Ve a <strong className="text-white">Deployments</strong>, abre el menú <strong className="text-white">⋯</strong>{" "}
              del último despliegue y pulsa <strong className="text-white">Redeploy</strong>.
            </li>
          </ol>
          <p className="mt-5 text-sm text-zinc-400">
            Las tablas y el contenido de ejemplo se crean solos en la primera visita. Si ya tienes otra base (Supabase,
            Railway…), pega su conexión en <strong>Settings → Environment Variables</strong> con el nombre{" "}
            <code className="rounded bg-black/50 px-1.5 py-0.5">DATABASE_URL</code>. En tu computadora, ponla en el archivo{" "}
            <code className="rounded bg-black/50 px-1.5 py-0.5">.env.local</code>.
          </p>
          {admin && (
            <p className="mt-3 text-sm text-zinc-400">Cuando la base esté conectada podrás entrar al panel con tu contraseña.</p>
          )}
        </div>
      </div>
    </div>
  );
}
