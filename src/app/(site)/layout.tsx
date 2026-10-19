import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { isDatabaseConfigured } from "@/db";
import { DbMissing } from "@/components/DbMissing";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PreviewBanner } from "@/components/PreviewBanner";
import { getCustomSections, getPageTexts, getSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { buildNav, buildSubsiteNav } from "@/lib/nav";
import { getCurrentSite } from "@/lib/site";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  if (!isDatabaseConfigured()) return <DbMissing />;

  const [site, settings, pages, customs] = await Promise.all([
    getCurrentSite(),
    getSettings(),
    getPageTexts(),
    getCustomSections(),
  ]);
  const visible = customs.filter((c) => c.visible);
  // Cada sitio tiene su propio menú: el principal con sus secciones fijas, los subdominios con sus páginas
  const nav = site.isMain ? buildNav(pages, visible) : buildSubsiteNav(visible, pages);
  const donateHref = site.isMain
    ? pages.donacion?.visible !== false
      ? "/Donacion"
      : null
    : (visible.find((c) => c.type.key === "donations")?.path ?? null);
  const wa = waLink(settings.whatsapp, settings.whatsappMessage);

  return (
    <>
      {site.via === "preview" && <PreviewBanner slug={site.slug} name={settings.siteName} />}
      <Header settings={settings} nav={nav} donateHref={donateHref} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer settings={settings} nav={nav} />
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribir por WhatsApp"
          className="no-print fixed right-5 bottom-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-zinc-950 shadow-xl shadow-black/50 transition hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </>
  );
}
