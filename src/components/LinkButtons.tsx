import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/format";
import { linkHost, linkProvider, safeUrl, type ItemLink } from "@/lib/links";
import { Icon } from "./icons";

/** Botones con nombre personalizado (ej: “Descargar por Mediafire”), con el color e ícono del servicio. */
export function LinkButtons({
  links,
  size = "md",
  className,
}: {
  links: ItemLink[] | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const list = (links ?? []).map((l) => ({ ...l, href: safeUrl(l.url) })).filter((l) => l.href);
  if (list.length === 0) return null;

  if (size === "lg") {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {list.map((l, i) => {
          const p = linkProvider(l.href);
          const external = !l.href.startsWith("/");
          return (
            <a
              key={`${l.href}-${i}`}
              href={l.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-zinc-900"
              style={{ boxShadow: `inset 4px 0 0 ${p.color}` }}
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-lg"
                style={{ background: p.color }}
              >
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg leading-tight font-bold text-white">{l.label || p.defaultLabel}</span>
                <span className="block truncate text-xs text-zinc-500">{p.key === "web" ? linkHost(l.href) : p.name}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-white" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {list.map((l, i) => {
        const p = linkProvider(l.href);
        const external = !l.href.startsWith("/");
        return (
          <a
            key={`${l.href}-${i}`}
            href={l.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 font-semibold text-zinc-100 transition hover:border-white/30 hover:bg-white/10",
              size === "sm" ? "py-1 pr-3 pl-1 text-xs" : "py-1.5 pr-4 pl-1.5 text-sm",
            )}
          >
            <span
              className={cn("grid shrink-0 place-items-center rounded-lg text-white", size === "sm" ? "h-6 w-6" : "h-8 w-8")}
              style={{ background: p.color }}
            >
              <Icon name={p.icon} className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
            {l.label || p.defaultLabel}
          </a>
        );
      })}
    </div>
  );
}
