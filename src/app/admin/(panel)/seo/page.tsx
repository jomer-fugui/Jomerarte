import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { CircleAlert, CircleCheck, ExternalLink, FileText, Send } from "lucide-react";
import { db, isDatabaseConfigured } from "@/db";
import { items } from "@/db/schema";
import { getMenuModel } from "@/lib/data";
import { cn } from "@/lib/format";
import { rootDomain, siteLabel } from "@/lib/hosts";
import { indexNowStatus } from "@/lib/indexnow";
import {
  BUSINESS_TYPES,
  aiPolicyOf,
  geoOf,
  hoursText,
  isLocalBusinessType,
  parseHours,
  splitList,
  verificationCode,
} from "@/lib/seo";
import { getDefaultSeo, getSeoContext } from "@/lib/seo-server";
import { getCurrentSite } from "@/lib/site";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { pingAllAction } from "../../seo-actions";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; title: string; text: string; href?: string; external?: boolean; optional?: boolean };

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const good = value >= min && value <= max;
  return <span className={good ? "text-emerald-400" : "text-amber-300"}>{value} letras</span>;
}

/** Google, Bing y asistentes con IA: qué falta completar, vista previa y herramientas. */
export default async function SeoPage({ searchParams }: { searchParams: Promise<{ ping?: string; msg?: string }> }) {
  const [d, seo, site, menu, sp] = await Promise.all([getDefaultSeo(), getSeoContext(), getCurrentSite(), getMenuModel(), searchParams]);
  const s = seo.settings;
  const local = isLocalBusinessType(seo.businessType);
  const base = seo.base;
  const ind = indexNowStatus();
  const policy = aiPolicyOf(s.aiPolicy);

  // Calidad del contenido: publicaciones con página propia sin descripción
  const detailKeys: string[] = [];
  for (const g of menu.groups) for (const e of g.entries) if (e.visible && e.def?.detail) detailKeys.push(e.def.key);
  const rows =
    isDatabaseConfigured() && detailKeys.length
      ? await db
          .select({ subtitle: items.subtitle, content: items.content, imageUrl: items.imageUrl })
          .from(items)
          .where(and(eq(items.site, site.slug), eq(items.published, true), inArray(items.section, detailKeys)))
      : [];
  const noDesc = rows.filter((r) => r.content.trim().length < 40 && r.subtitle.trim().length < 10).length;
  const noImage = rows.filter((r) => !r.imageUrl.trim()).length;

  const fix = "/admin/ajustes#ubicacion";
  const seoFix = "/admin/ajustes#google-ia";
  const checks: Check[] = [
    ...(site.isMain
      ? [
          {
            ok: Boolean(rootDomain()),
            title: "Dominio configurado",
            text: rootDomain()
              ? `Google y las IA ven tu dominio: ${rootDomain()}.`
              : "En Vercel agrega la variable NEXT_PUBLIC_SITE_URL=https://jomerarte.com. Sin ella, las direcciones que ven Google y las IA no son las definitivas.",
          },
        ]
      : []),
    {
      ok: true,
      title: "Tipo de sitio",
      text: `${BUSINESS_TYPES.find((b) => b.value === seo.businessType)?.label ?? seo.businessType}.`,
      href: fix,
    },
    {
      ok: Boolean(s.city.trim()),
      title: "Ciudad y provincia",
      text: s.city ? [s.city, s.region].filter(Boolean).join(", ") : "Indica tu ciudad para aparecer en búsquedas de tu zona.",
      href: fix,
    },
    ...(local
      ? [
          {
            ok: splitList(s.serviceArea).length > 0,
            title: "Zonas donde trabajas",
            text: splitList(s.serviceArea).length
              ? splitList(s.serviceArea).join(", ")
              : "Escribe los barrios o ciudades donde trabajas: así te recomiendan cuando alguien busca allí.",
            href: fix,
          },
          {
            ok: Boolean(s.phone.trim() || s.whatsapp.trim()),
            title: "Teléfono o WhatsApp",
            text: s.phone || s.whatsapp || "Agrega un teléfono o WhatsApp de contacto.",
            href: "/admin/ajustes#contacto",
          },
          {
            ok: Boolean(hoursText(parseHours(s.openingHours))),
            title: "Horarios de atención",
            text: hoursText(parseHours(s.openingHours)) || "Carga tus horarios por día.",
            href: fix,
          },
          {
            ok: Boolean(s.mapsUrl.trim()),
            title: "Ficha de Google Maps (Perfil de Empresa)",
            text: s.mapsUrl
              ? "Enlazada."
              : "Crea gratis tu Perfil de Empresa en Google y pega aquí su enlace. Es lo que más ayuda a aparecer en Google Maps y en búsquedas como “electricista cerca de mí”.",
            href: s.mapsUrl ? fix : "https://business.google.com/",
            external: !s.mapsUrl,
          },
          {
            ok: Boolean(geoOf(s)),
            title: "Ubicación exacta (coordenadas)",
            text: geoOf(s) ? `${geoOf(s)?.lat}, ${geoOf(s)?.lng}` : "Opcional: copia las coordenadas desde Google Maps.",
            href: fix,
            optional: true,
          },
        ]
      : []),
    {
      ok: (s.seoDescription || s.heroText).trim().length >= 70,
      title: "Descripción para Google y las IA",
      text: s.seoDescription
        ? "Escrita."
        : "Escribe una descripción de 120 a 160 letras con lo que haces y dónde (ahora se usa el texto de bienvenida).",
      href: seoFix,
    },
    {
      ok: Boolean(s.logoUrl || s.logoLightUrl),
      title: "Logo propio",
      text: s.logoUrl || s.logoLightUrl ? "Subido." : "Sube tu logo: aparece en Google y al compartir tus enlaces.",
      href: "/admin/ajustes#identidad",
    },
    {
      ok: seo.sameAs.length > 0,
      title: "Redes sociales y perfiles",
      text: seo.sameAs.length
        ? `${seo.sameAs.length} enlazados: ayudan a confirmar que eres tú.`
        : "Agrega tus redes (Instagram, Facebook, YouTube…) y tu ficha de Google Maps.",
      href: "/admin/ajustes#redes",
    },
    {
      ok: Boolean(verificationCode(s.googleVerification)),
      title: "Google Search Console",
      text: verificationCode(s.googleVerification)
        ? "Código de verificación cargado."
        : "Verifica tu sitio para ver cómo te encuentran y enviar el sitemap. Si lo verificaste por DNS, ignora este punto.",
      href: "https://search.google.com/search-console",
      external: true,
      optional: true,
    },
    {
      ok: Boolean(verificationCode(s.bingVerification)),
      title: "Bing Webmaster Tools (ChatGPT y Copilot)",
      text: verificationCode(s.bingVerification)
        ? "Código de verificación cargado."
        : "Bing alimenta las búsquedas de ChatGPT y Copilot. Puedes importar tu sitio desde Search Console en un clic.",
      href: "https://www.bing.com/webmasters",
      external: true,
      optional: true,
    },
    {
      ok: policy !== "block",
      title: "Asistentes con IA",
      text:
        policy === "all"
          ? "Permitidos: ChatGPT, Gemini, Claude, Perplexity y otros pueden leer y recomendar tu sitio."
          : policy === "no-training"
            ? "Pueden recomendarte, pero no usar tu contenido para entrenar modelos."
            : "Bloqueados: no podrán recomendar tu sitio.",
      href: seoFix,
    },
    {
      ok: ind.enabled,
      title: "Aviso instantáneo a Bing (IndexNow)",
      text: ind.enabled ? "Activo: cada vez que publicas o cambias algo, se avisa solo." : (ind.reason ?? "Inactivo."),
    },
    {
      ok: rows.length === 0 || noDesc / rows.length <= 0.1,
      title: "Publicaciones con descripción",
      text:
        rows.length === 0
          ? "Todavía no hay publicaciones con página propia."
          : noDesc === 0
            ? `Las ${rows.length} publicaciones tienen descripción.${noImage ? ` ${noImage} no tienen imagen.` : ""}`
            : `${noDesc} de ${rows.length} publicaciones casi no tienen texto. Las IA recomiendan lo que pueden leer: agrega una descripción.${noImage ? ` ${noImage} no tienen imagen.` : ""}`,
    },
  ];
  const required = checks.filter((c) => !c.optional);
  const score = Math.round((required.filter((c) => c.ok).length / Math.max(1, required.length)) * 100);
  const home = `${base}/`;
  const tools = [
    { label: "Probar datos estructurados (Google)", href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(home)}` },
    { label: "Validador de schema.org", href: `https://validator.schema.org/#url=${encodeURIComponent(home)}` },
    { label: "Google Search Console", href: "https://search.google.com/search-console" },
    { label: "Bing Webmaster Tools", href: "https://www.bing.com/webmasters" },
    { label: "Perfil de Empresa en Google", href: "https://business.google.com/" },
    { label: "Velocidad (PageSpeed Insights)", href: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(home)}` },
  ];
  const files = [
    { label: "sitemap.xml", href: `${base}/sitemap.xml`, text: "Todas tus páginas, para Google y Bing" },
    { label: "robots.txt", href: `${base}/robots.txt`, text: "Permisos para buscadores e IA" },
    { label: "llms.txt", href: `${base}/llms.txt`, text: "Resumen de tu sitio para las IA" },
    { label: "llms-full.txt", href: `${base}/llms-full.txt`, text: "Todas tus publicaciones en texto para las IA" },
  ];

  return (
    <div className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-white">
          Panel
        </Link>{" "}
        / <span className="text-zinc-300">Google e IA</span>
      </nav>
      <div>
        <h1 className="font-display text-3xl font-bold text-white uppercase">Google e inteligencia artificial</h1>
        <p className="mt-1 max-w-3xl text-zinc-400">
          Tu sitio ya entrega a Google, Bing y a los asistentes con IA (ChatGPT, Gemini, Copilot, Claude, Perplexity) la
          información de tu negocio, tu ubicación y cada publicación en un formato que entienden. Completa lo que falta para
          que te recomienden cuando alguien busca lo que haces en tu zona.
        </p>
        <p className="mt-1 text-sm text-zinc-500">Sitio: {siteLabel(site.slug)}</p>
      </div>

      {sp.ping && (
        <div
          className={
            sp.ping === "ok"
              ? "rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200"
              : "rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200"
          }
        >
          {sp.msg}
        </div>
      )}

      <section className="card space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Tu sitio está al {score}%</h2>
            <p className="text-sm text-zinc-500">Los puntos marcados como opcionales no cuentan para el porcentaje.</p>
          </div>
          <Link href={fix} className="btn-primary btn-sm">
            Completar ubicación y datos
          </Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full", score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-500")}
            style={{ width: `${score}%` }}
          />
        </div>
        <ul className="divide-y divide-white/5">
          {checks.map((c) => (
            <li key={c.title} className="flex items-start gap-3 py-3">
              {c.ok ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <CircleAlert className={cn("mt-0.5 h-5 w-5 shrink-0", c.optional ? "text-zinc-500" : "text-amber-300")} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">
                  {c.title}
                  {c.optional && <span className="ml-2 text-xs font-normal text-zinc-500">opcional</span>}
                </p>
                <p className="text-sm break-words text-zinc-400">{c.text}</p>
              </div>
              {c.href &&
                (c.external ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm shrink-0">
                    Abrir <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link href={c.href} className="btn-ghost btn-sm shrink-0">
                    {c.ok ? "Editar" : "Completar"}
                  </Link>
                ))}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Así te ve Google</h2>
        <div className="rounded-xl bg-white p-5 text-left">
          <p className="truncate text-sm text-[#202124]">{home.replace(/^https?:\/\//, "")}</p>
          <p className="mt-1 text-xl leading-snug text-[#1a0dab]">{d.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#4d5156]">{d.description}</p>
        </div>
        <p className="text-xs text-zinc-500">
          Título: <Counter value={d.title.length} min={20} max={65} /> (ideal hasta 60) · Descripción:{" "}
          <Counter value={d.description.length} min={70} max={160} /> (ideal 120 a 160).{" "}
          <Link href={seoFix} className="font-semibold text-accent-light hover:underline">
            Cambiar título y descripción
          </Link>
        </p>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Avisar a Bing ahora (IndexNow)</h2>
            <p className="text-sm text-zinc-400">
              Cada vez que publicas o cambias algo, se avisa solo a Bing (que usan ChatGPT y Copilot), Yandex y otros
              buscadores. Con este botón avisas de todas tus páginas a la vez, por ejemplo después de completar tus datos.
              Google no usa IndexNow: para Google envía tu sitemap desde Search Console.
            </p>
          </div>
          {ind.enabled ? (
            <form action={pingAllAction}>
              <SubmitButton icon={false} pendingLabel="Avisando…">
                <Send className="h-4 w-4" /> Avisar de todas mis páginas
              </SubmitButton>
            </form>
          ) : (
            <p className="max-w-xs text-sm text-amber-300">{ind.reason}</p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 p-6">
          <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Archivos para buscadores e IA</h2>
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.label}>
                <a
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/30"
                >
                  <FileText className="h-5 w-5 shrink-0 text-accent-light" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white">{f.label}</span>
                    <span className="block text-xs text-zinc-500">{f.text}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="card space-y-3 p-6">
          <h2 className="font-display text-xl font-bold tracking-wide text-white uppercase">Herramientas oficiales</h2>
          <ul className="space-y-2">
            {tools.map((t) => (
              <li key={t.label}>
                <a
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-semibold text-white transition hover:border-white/30"
                >
                  {t.label} <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card space-y-3 p-6 text-sm text-zinc-400">
        <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">Consejos para que te recomienden más</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-zinc-200">Perfil de Empresa en Google:</strong> créalo con el mismo nombre, teléfono y zona
            que en tu sitio, y pide a tus clientes que te dejen reseñas. Es lo que más pesa en Google Maps.
          </li>
          <li>
            <strong className="text-zinc-200">Escribe como habla tu cliente:</strong> en títulos y descripciones usa frases
            como “electricista en Quilmes” o “instalación de cámaras en zona sur”.
          </li>
          <li>
            <strong className="text-zinc-200">Preguntas frecuentes:</strong> crea una página nueva del tipo “Preguntas y
            respuestas” en Servicios (¿trabajan los sábados?, ¿hacen presupuestos sin cargo?). Las IA usan mucho ese formato.
          </li>
          <li>
            <strong className="text-zinc-200">Publica seguido</strong> y agrega fotos de trabajos reales con una descripción:
            cada publicación es una nueva oportunidad de aparecer.
          </li>
          <li>
            <strong className="text-zinc-200">Mismos datos en todos lados:</strong> usa el mismo nombre, teléfono y zona en tu
            sitio, Google Maps, Instagram, Facebook y Mercado Libre.
          </li>
        </ul>
      </section>
    </div>
  );
}
