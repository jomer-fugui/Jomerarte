"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, House, Menu, X } from "lucide-react";
import type { NavGroup } from "@/lib/nav";
import type { SocialLink } from "@/lib/social";
import { cn } from "@/lib/format";
import { Icon, SocialIcon } from "./icons";

/**
 * Menú para celulares y tablets.
 * Se dibuja con un “portal” directamente dentro de <body>: así no queda atrapado dentro de la
 * barra superior (que usa desenfoque de fondo) y ocupa toda la pantalla con el menú completo.
 */
export function MobileNav({
  nav,
  showDonate,
  socials,
}: {
  nav: NavGroup[];
  showDonate: boolean;
  socials: SocialLink[];
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);
  const isActive = (href: string) => (pathname ?? "").toLowerCase() === href.toLowerCase();

  const drawer = (
    <div className="fixed inset-0 z-[70] xl:hidden" role="dialog" aria-modal="true" aria-label="Menú del sitio">
      <button type="button" className="absolute inset-0 bg-black/75" aria-label="Cerrar menú" onClick={close} />
      <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l border-white/10 bg-zinc-950 shadow-2xl shadow-black">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="font-brand tracking-[0.2em] text-white">MENÚ</span>
          <button
            type="button"
            onClick={close}
            className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="Secciones">
          <Link
            href="/"
            onClick={close}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 font-medium hover:bg-white/5",
              pathname === "/" ? "bg-accent/15 text-white" : "text-white",
            )}
          >
            <House className="h-5 w-5 text-accent-light" /> Inicio
          </Link>

          {nav.map((g) => {
            const expanded = !collapsed[g.key];
            return (
              <div key={g.key} className="mt-1 border-t border-white/5 pt-1">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5"
                >
                  <Icon name={g.icon} className="h-5 w-5 text-accent-light" />
                  <span className="flex-1 font-display text-base font-bold tracking-wide text-white uppercase">{g.label}</span>
                  <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", expanded && "rotate-180")} />
                </button>
                {expanded && (
                  <ul className="mb-2 ml-5 border-l border-white/10 pl-2">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={close}
                          aria-current={isActive(l.href) ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] transition hover:bg-white/5 hover:text-white",
                            isActive(l.href) ? "bg-accent/15 text-white" : "text-zinc-300",
                          )}
                        >
                          <Icon name={l.icon} className="h-4 w-4 shrink-0 text-zinc-500" />
                          <span>{l.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {(showDonate || socials.length > 0) && (
          <div className="shrink-0 space-y-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {showDonate && (
              <Link href="/Donacion" onClick={close} className="btn-primary w-full">
                <Heart className="h-4 w-4" /> Donar
              </Link>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-accent hover:text-white"
                  >
                    <SocialIcon kind={s.key} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white xl:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && createPortal(drawer, document.body)}
    </>
  );
}
