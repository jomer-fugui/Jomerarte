import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Image as ImageIcon, LayoutDashboard, LogOut, Settings, Tag } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { siteLabel } from "@/lib/hosts";
import { getCurrentSite, getSitesOverview } from "@/lib/site";
import { SiteLogo } from "@/components/Logo";
import { SiteSwitcher } from "@/components/admin/SiteSwitcher";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Panel de administración", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const [settings, site, overview] = await Promise.all([getSettings(), getCurrentSite(), getSitesOverview()]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <SiteLogo settings={settings} className="h-9 w-9" idPrefix="adm" />
            <span className="hidden font-brand text-sm tracking-[0.2em] text-white lg:inline">PANEL</span>
          </Link>
          <SiteSwitcher sites={overview} current={site.slug} locked={site.via === "host"} />
          <nav className="ml-auto flex items-center gap-0.5">
            <Link href="/admin" className="navlink inline-flex items-center gap-1.5" title="Contenido">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">Contenido</span>
            </Link>
            <Link href="/admin/ajustes" className="navlink inline-flex items-center gap-1.5" title="Ajustes y logo">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Ajustes</span>
            </Link>
            <Link href="/admin/medios" className="navlink hidden items-center gap-1.5 sm:inline-flex" title="Archivos">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden md:inline">Archivos</span>
            </Link>
            <Link href="/admin/sitios" className="navlink hidden items-center gap-1.5 sm:inline-flex" title="Sitios y subdominios">
              <Globe className="h-4 w-4" />
              <span className="hidden md:inline">Sitios</span>
            </Link>
            <Link href="/admin/mercadolibre" className="navlink inline-flex items-center gap-1.5" title="Precios de Mercado Libre">
              <Tag className="h-4 w-4" />
              <span className="hidden lg:inline">Precios ML</span>
            </Link>
            <Link href="/" target="_blank" className="navlink inline-flex items-center gap-1.5" title="Ver sitio">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden md:inline">Ver sitio</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="navlink inline-flex items-center gap-1.5" title="Salir">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </form>
          </nav>
        </div>
      </header>
      {!site.isMain && (
        <div className="border-b border-accent/30 bg-accent/10">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-zinc-200">
            Estás editando <strong className="text-white">{settings.siteName}</strong> ({siteLabel(site.slug)}): un sitio
            independiente. Los cambios que hagas aquí no afectan al sitio principal ni a los otros subdominios.
          </p>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
