import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { isDatabaseConfigured } from "@/db";
import { DbMissing } from "@/components/DbMissing";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCustomSections, getPageTexts, getSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { buildNav } from "@/lib/nav";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  if (!isDatabaseConfigured()) return <DbMissing />;

  const [settings, pages, customs] = await Promise.all([getSettings(), getPageTexts(), getCustomSections()]);
  const nav = buildNav(
    pages,
    customs.filter((c) => c.visible),
  );
  const wa = waLink(settings.whatsapp, settings.whatsappMessage);

  return (
    <>
      <Header settings={settings} nav={nav} showDonate={pages.donacion?.visible !== false} />
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
