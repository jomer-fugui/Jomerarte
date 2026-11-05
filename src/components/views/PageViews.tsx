import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Gamepad2, HardDrive, MapPin, Tag, User } from "lucide-react";
import { getItems, type CustomSection, type Item, type PageText } from "@/lib/data";
import type { Settings } from "@/lib/defaults";
import { excerpt, formatDate, itemCategories } from "@/lib/format";
import { formatMoney, mlDiscountPercent, mlStatusLabel } from "@/lib/ml-ref";
import { buildTabs, groupEntries, menuCrumbs, menuEyebrow, type MenuModel, type Tab } from "@/lib/nav";
import type { HubDef, SectionDef } from "@/lib/sections";
import { Gallery } from "../client";
import { LinkButtons } from "../LinkButtons";
import { MediaPlayer } from "../media";
import {
  AdminFab,
  BuyButton,
  ContactButton,
  ItemImage,
  PageHero,
  PlatformBadge,
  PriceTag,
  RichText,
  SectionHeading,
  SmartLink,
  Stars,
  SubNav,
} from "../ui";
import { Icon } from "../icons";
import { SectionBody, itemPath } from "./SectionView";

export { itemPath };

function textFor(section: SectionDef, pages: Record<string, PageText>): PageText {
  return (
    pages[section.key] ?? {
      key: section.key,
      navLabel: section.navLabel,
      title: section.title,
      intro: section.intro,
      imageUrl: section.image ?? "",
      visible: true,
      icon: section.icon,
      group: section.group,
      options: section.options ?? {},
    }
  );
}

/* ───────────────────────── Página de sección (predeterminada o creada desde el panel) */
export function SectionPage({
  section,
  text,
  items,
  settings,
  tabs,
  admin,
  category,
  query,
  extra,
  eyebrow,
  menu,
}: {
  section: SectionDef;
  text: PageText;
  items: Item[];
  settings: Settings;
  tabs: Tab[];
  admin: boolean;
  category?: string;
  query?: string;
  /** Página personalizada: texto, video, galería y botones extra */
  extra?: Item;
  /** Texto pequeño sobre el título (por defecto, la sección del menú) */
  eyebrow?: string;
  menu?: MenuModel;
}) {
  const hasExtra = Boolean(extra && (extra.content || extra.videoUrl || extra.gallery.length > 0 || extra.links.length > 0));
  const actions =
    section.layout === "services" || extra?.linkUrl ? (
      <>
        {section.layout === "services" && <ContactButton settings={settings} topic={text.title} label="Pedir presupuesto" />}
        {extra?.linkUrl && (
          <SmartLink href={extra.linkUrl} className="btn-ghost">
            {extra.linkLabel || "Ver más"}
          </SmartLink>
        )}
      </>
    ) : null;

  return (
    <>
      <PageHero
        title={text.title}
        intro={text.intro}
        image={text.imageUrl}
        icon={section.icon}
        eyebrow={eyebrow ?? menuEyebrow(menu, section.key, settings.siteName)}
        crumbs={menuCrumbs(menu, section.key)}
        tone={section.layout === "bad" ? "danger" : "default"}
      >
        {actions}
      </PageHero>
      <SubNav tabs={tabs} current={section.key} />
      <div className="container-x py-12">
        {hasExtra && extra && (
          <div className="mb-12 space-y-8">
            <RichText text={extra.content} className="max-w-3xl text-lg text-zinc-300" />
            <LinkButtons links={extra.links} />
            {extra.videoUrl && <MediaPlayer url={extra.videoUrl} title={text.title} className="max-w-4xl" />}
            {extra.gallery.length > 0 && <Gallery urls={extra.gallery} title={text.title} />}
          </div>
        )}
        <SectionBody section={section} items={items} settings={settings} category={category} query={query} admin={admin} />
      </div>
      {admin && <AdminFab href={`/admin/s/${section.key}`} />}
    </>
  );
}

/* ───────────────────────── Páginas principales (Servicios, Tienda, Recomendaciones, Truchadas) */
export async function HubView({
  hub,
  pages,
  settings,
  admin,
  menu,
  siteSlug,
}: {
  hub: HubDef;
  pages: Record<string, PageText>;
  settings: Settings;
  admin: boolean;
  menu: MenuModel;
  siteSlug: string;
}) {
  const text = pages[hub.key];
  // Las páginas de la sección, en el mismo orden que en el menú
  const entries = groupEntries(menu, hub.group);
  const previews = await Promise.all(
    entries.map((e) => (e.def ? getItems(e.def.key, { limit: 4, site: siteSlug }) : Promise.resolve<Item[]>([]))),
  );
  const tabs = buildTabs(menu, hub.key);
  const danger = hub.key === "truchadas";

  const stores = [
    { url: settings.storeMercadoLibre, label: "Mi tienda en Mercado Libre", bg: "#FFE600", fg: "#2D3277" },
    { url: settings.storeHotmart, label: "Mis productos en Hotmart", bg: "#F04E23", fg: "#fff" },
    { url: settings.storeAliExpress, label: "Mi tienda en AliExpress", bg: "#E62E04", fg: "#fff" },
    { url: settings.storeAmazon, label: "Mi tienda en Amazon", bg: "#FF9900", fg: "#111" },
    { url: settings.storeOther, label: settings.storeOtherLabel || "Otra tienda", bg: "#3f3f46", fg: "#fff" },
  ].filter((s) => s.url);

  const actions =
    hub.key === "servicios" ? (
      <ContactButton settings={settings} label="Pedir presupuesto" />
    ) : hub.key === "tienda" && stores.length > 0 ? (
      <>
        {stores.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
            style={{ background: s.bg, color: s.fg }}
          >
            {s.label}
          </a>
        ))}
      </>
    ) : null;

  return (
    <>
      <PageHero
        title={text.title}
        intro={text.intro}
        image={text.imageUrl}
        icon={hub.icon}
        crumbs={[{ href: "/", label: "Inicio" }]}
        tone={danger ? "danger" : "default"}
      >
        {actions}
      </PageHero>
      <SubNav tabs={tabs} current={hub.key} />

      <div className="container-x space-y-20 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((e) => (
            <Link key={e.key} href={e.path} className="card card-hover group flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <ItemImage
                  src={e.image}
                  alt={e.title}
                  icon={e.icon}
                  label={e.navLabel}
                  className="transition duration-700 group-hover:scale-105"
                />
                <span
                  className={
                    danger
                      ? "absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-red-600/80 text-white"
                      : "absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-accent/90 text-white"
                  }
                >
                  <Icon name={e.icon} className="h-5 w-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-xl leading-tight font-bold text-white">{e.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{excerpt(e.intro, 110)}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-accent-light">
                  Entrar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {entries.map((e, i) =>
          e.def && previews[i].length > 0 ? (
            <section key={e.key}>
              <SectionHeading eyebrow={e.navLabel} title={e.title} href={e.path} />
              <div className="mt-8">
                <SectionBody section={e.def} items={previews[i]} settings={settings} admin={admin} preview />
              </div>
            </section>
          ) : null,
        )}
      </div>
      {admin && <AdminFab href={`/admin/pagina/${hub.key}`} label="Editar textos" />}
    </>
  );
}

/* ───────────────────────── Detalle de un elemento */
export async function ItemDetailView({
  section,
  item,
  pages,
  settings,
  admin,
  menu,
  siteSlug,
}: {
  section: SectionDef;
  item: Item;
  pages: Record<string, PageText>;
  settings: Settings;
  admin: boolean;
  menu?: MenuModel;
  siteSlug: string;
}) {
  const text = textFor(section, pages);
  const all = await getItems(section.key, { site: siteSlug });
  const idx = all.findIndex((i) => i.id === item.id);
  const prev = idx > 0 ? all[idx - 1] : undefined;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;
  const others = all.filter((i) => i.id !== item.id).slice(0, 4);
  const isGame = section.layout === "games";
  const isCommerce = section.layout === "products" || section.layout === "services";
  const crumbs = [...menuCrumbs(menu, section.key), { href: section.path, label: text.navLabel }];
  const cats = itemCategories(item);
  const specs = isGame
    ? [
        { icon: Gamepad2, label: "Plataforma", value: item.subtitle },
        { icon: HardDrive, label: "Tamaño", value: item.unit },
        { icon: User, label: "Desarrollador", value: item.location },
        { icon: Tag, label: "Precio", value: item.price },
      ].filter((s) => s.value)
    : [];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-zinc-950/40 to-zinc-950" />
        <div className="container-x grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-16">
          <div className="order-2 lg:order-1">
            <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400" aria-label="Migas de pan">
              {crumbs.map((c) => (
                <span key={c.href} className="inline-flex items-center gap-1.5">
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                  <span>/</span>
                </span>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              {cats.map((c) => (
                <Link key={c} href={`${section.path}?cat=${encodeURIComponent(c)}`} className="chip hover:border-accent hover:text-white">
                  {c}
                </Link>
              ))}
              {item.platform && <PlatformBadge platform={item.platform} />}
              <Stars value={item.rating} bad={section.layout === "bad"} />
            </div>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] font-bold tracking-wide text-white uppercase sm:text-5xl">
              {item.title}
            </h1>
            {item.subtitle && !isGame && <p className="mt-3 text-lg font-medium text-accent-light">{item.subtitle}</p>}
            {item.location && !isGame && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-400">
                <MapPin className="h-4 w-4 text-accent-light" /> {item.location}
              </p>
            )}
            {specs.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {specs.map(({ icon: I, label, value }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
                      <I className="h-3.5 w-3.5" /> {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold break-words text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {item.price && !isGame && (
              <div className="mt-6">
                <PriceTag price={item.price} unit={item.unit} />
                {item.mlSync && item.mlInfo?.checkedAt ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {mlDiscountPercent(item.mlInfo) && item.mlInfo.original ? (
                      <>
                        <span className="line-through">{formatMoney(item.mlInfo.original, item.mlInfo.currency)}</span>{" "}
                        <span className="font-semibold text-emerald-400">{mlDiscountPercent(item.mlInfo)}% OFF</span> ·{" "}
                      </>
                    ) : null}
                    Precio de Mercado Libre, actualizado el {formatDate(item.mlInfo.checkedAt)}
                    {mlStatusLabel(item.mlInfo) ? <span className="text-amber-300"> · {mlStatusLabel(item.mlInfo)}</span> : null}
                  </p>
                ) : null}
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              {isGame && item.links.length > 0 && (
                <a href="#descargas" className="btn-primary px-6 py-3">
                  <Download className="h-4 w-4" /> Descargar
                  {item.links.length > 1 && <span className="opacity-75">({item.links.length} opciones)</span>}
                </a>
              )}
              {item.linkUrl &&
                (isCommerce ? (
                  <BuyButton url={item.linkUrl} platform={item.platform} label={item.linkLabel} className="px-5 py-3 text-sm" />
                ) : (
                  <SmartLink href={item.linkUrl} className={isGame ? "btn-ghost" : "btn-primary"}>
                    {item.linkLabel || "Ver enlace"}
                  </SmartLink>
                ))}
              {isCommerce && <ContactButton settings={settings} topic={item.title} />}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title}
                className="mx-auto max-h-[70vh] w-auto rounded-2xl border border-white/10 object-contain shadow-2xl shadow-black/60"
              />
            ) : item.videoUrl ? (
              <MediaPlayer url={item.videoUrl} title={item.title} />
            ) : (
              <div className="mx-auto aspect-square max-w-md overflow-hidden rounded-2xl border border-white/10">
                <ItemImage alt={item.title} icon={section.icon} label={item.title} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container-x space-y-16 py-12">
        {item.content && (
          <RichText
            text={item.content}
            className={
              section.layout === "songs" || section.layout === "poems"
                ? "max-w-3xl font-serif text-lg whitespace-pre-line text-zinc-200"
                : "max-w-3xl text-lg text-zinc-300"
            }
          />
        )}
        {item.videoUrl && item.imageUrl && (
          <section>
            <SectionHeading title={isGame ? "Tráiler" : "Video"} />
            <MediaPlayer url={item.videoUrl} title={item.title} className="mt-6 max-w-4xl" />
          </section>
        )}
        {item.gallery.length > 0 && (
          <section>
            <SectionHeading title={isGame ? "Capturas" : "Galería"} />
            <Gallery urls={item.gallery} title={item.title} className="mt-6" />
          </section>
        )}
        {item.links.length > 0 && (
          <section id="descargas" className="scroll-mt-24">
            <SectionHeading title={isGame ? "Descargas" : "Enlaces"} />
            <LinkButtons links={item.links} size="lg" className="mt-6 max-w-4xl" />
          </section>
        )}

        {(prev || next) && (
          <nav className="grid gap-4 sm:grid-cols-2" aria-label="Navegación entre elementos">
            {prev ? (
              <Link href={itemPath(section.path, prev)} className="card card-hover p-5">
                <span className="inline-flex items-center gap-1 text-xs tracking-widest text-zinc-500 uppercase">
                  <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                </span>
                <span className="mt-1 block font-display text-xl font-bold text-white">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={itemPath(section.path, next)} className="card card-hover p-5 text-right">
                <span className="inline-flex items-center gap-1 text-xs tracking-widest text-zinc-500 uppercase">
                  Siguiente <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block font-display text-xl font-bold text-white">{next.title}</span>
              </Link>
            )}
          </nav>
        )}

        {others.length > 0 && (
          <section>
            <SectionHeading eyebrow="Más contenido" title={text.navLabel} href={section.path} />
            <div className="mt-8">
              <SectionBody section={section} items={others} settings={settings} admin={admin} preview />
            </div>
          </section>
        )}
      </div>
      {admin && <AdminFab href={`/admin/s/${section.key}/${item.id}`} label="Editar" />}
    </>
  );
}

/* ───────────────────────── Página libre creada desde el panel */
export function CustomPageView({
  custom,
  tabs,
  admin,
  eyebrow,
  menu,
}: {
  custom: CustomSection;
  tabs: Tab[];
  admin: boolean;
  eyebrow?: string;
  menu?: MenuModel;
}) {
  const page = custom.item;
  return (
    <>
      <PageHero
        title={page.title}
        intro={page.subtitle}
        image={page.imageUrl}
        icon={custom.icon}
        eyebrow={eyebrow}
        crumbs={menuCrumbs(menu, custom.key)}
      >
        {page.linkUrl ? (
          <SmartLink href={page.linkUrl} className="btn-primary">
            {page.linkLabel || "Ver más"}
          </SmartLink>
        ) : null}
      </PageHero>
      <SubNav tabs={tabs} current={custom.key} />
      <div className="container-x space-y-12 py-12">
        <RichText text={page.content} className="max-w-3xl text-lg text-zinc-300" />
        <LinkButtons links={page.links} />
        {page.videoUrl && <MediaPlayer url={page.videoUrl} title={page.title} className="max-w-4xl" />}
        {page.gallery.length > 0 && <Gallery urls={page.gallery} title={page.title} />}
      </div>
      {admin && <AdminFab href={`/admin/s/custom/${page.id}`} label="Editar página" />}
    </>
  );
}
