import Link from "next/link";
import { Eye } from "lucide-react";
import { switchSiteAction } from "@/app/admin/actions";
import { siteLabel } from "@/lib/hosts";

/** Aviso que ve solo el administrador cuando revisa un subdominio desde el dominio principal. */
export function PreviewBanner({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="no-print border-b border-amber-400/30 bg-amber-400/10 text-amber-100">
      <div className="container-x flex flex-wrap items-center justify-between gap-2 py-2 text-xs sm:text-sm">
        <p className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Vista previa de <strong className="text-white">{name}</strong> ({siteLabel(slug)}). Solo tú la ves aquí porque
            estás editando ese sitio.
          </span>
        </p>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded-md bg-white/10 px-2.5 py-1 font-semibold hover:bg-white/20">
            Panel
          </Link>
          <form action={switchSiteAction}>
            <input type="hidden" name="site" value="" />
            <input type="hidden" name="redirectTo" value="/" />
            <button type="submit" className="rounded-md bg-amber-400 px-2.5 py-1 font-semibold text-zinc-950 hover:brightness-110">
              Volver al sitio principal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
