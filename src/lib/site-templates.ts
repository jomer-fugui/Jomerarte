import type { IconName, PageTypeKey } from "./sections";

/** Página que trae una plantilla de sitio. */
export interface TemplatePage {
  title: string;
  slug: string;
  type: PageTypeKey;
  intro?: string;
  /** Sección del sitio principal desde la que se puede copiar el contenido */
  copyFrom?: string;
  /** Su contenido se muestra en la portada del sitio */
  home?: boolean;
}

export interface SiteTemplate {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  tagline: string;
  heroText: string;
  heroImage?: string;
  pages: TemplatePage[];
}

/** Plantillas para empezar un subdominio nuevo (después todo se puede cambiar). */
export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    key: "blank",
    label: "En blanco",
    description: "Solo la portada. Después agregas las páginas que quieras.",
    icon: "file",
    tagline: "",
    heroText: "",
    pages: [],
  },
  {
    key: "frases",
    label: "Frases y poesías",
    description: "Páginas de Frases, Preguntas y Poesías.",
    icon: "quote",
    tagline: "Frases, preguntas y poesías",
    heroText: "Ego, consejos, reflexiones, negocios, política, verdades incómodas y alguna que otra estupidez.",
    pages: [
      { title: "Frases", slug: "Frases", type: "quotes", copyFrom: "frases", home: true },
      { title: "Preguntas", slug: "Preguntas", type: "colmos", copyFrom: "colmos" },
      { title: "Poesías", slug: "Poesias", type: "poems", copyFrom: "poesias" },
    ],
  },
  {
    key: "anime",
    label: "Anime / videojuego",
    description: "Personajes, historia por capítulos y proceso del proyecto.",
    icon: "swords",
    tagline: "Anime · Videojuego en desarrollo",
    heroText: "Conoce a los personajes, la historia y todo el proceso de creación.",
    heroImage: "/images/cielinfier.jpg",
    pages: [
      { title: "Personajes", slug: "Personajes", type: "characters", copyFrom: "cielinfier-personajes", home: true },
      { title: "Historia", slug: "historia", type: "story", copyFrom: "cielinfier-historia" },
      { title: "Proceso del proyecto", slug: "proceso", type: "devlog", copyFrom: "cielinfier-proceso" },
    ],
  },
  {
    key: "tienda",
    label: "Tienda",
    description: "Productos con botón de compra y lista de precios.",
    icon: "store",
    tagline: "Tienda online",
    heroText: "Productos seleccionados con compra segura en Mercado Libre, Hotmart, AliExpress y más.",
    pages: [
      { title: "Productos", slug: "Productos", type: "products", intro: "Elige tu producto y cómpralo en la plataforma que prefieras.", home: true },
      { title: "Lista de precios", slug: "Precios", type: "prices", intro: "Precios de referencia." },
    ],
  },
  {
    key: "servicios",
    label: "Servicios",
    description: "Servicios, trabajos realizados y lista de precios.",
    icon: "wrench",
    tagline: "Servicios profesionales",
    heroText: "Trabajo responsable, prolijo y con garantía.",
    pages: [
      { title: "Servicios", slug: "Servicios", type: "services", intro: "Lo que puedo hacer por ti.", home: true },
      { title: "Trabajos realizados", slug: "Trabajos", type: "inventions", intro: "Fotos y videos de trabajos terminados." },
      { title: "Lista de precios", slug: "Precios", type: "prices", intro: "Precios de referencia." },
    ],
  },
  {
    key: "portafolio",
    label: "Portafolio / galería",
    description: "Proyectos con fotos y videos, y una página Sobre mí.",
    icon: "image",
    tagline: "Portafolio",
    heroText: "Mis proyectos, ideas y trabajos.",
    pages: [
      { title: "Proyectos", slug: "Proyectos", type: "inventions", intro: "Fotos y videos de mis proyectos.", home: true },
      { title: "Sobre mí", slug: "SobreMi", type: "page", intro: "Quién soy y qué hago." },
    ],
  },
  {
    key: "blog",
    label: "Blog / novedades",
    description: "Publicaciones con fecha, fotos y videos.",
    icon: "newspaper",
    tagline: "Novedades",
    heroText: "Noticias, avances y novedades.",
    pages: [{ title: "Novedades", slug: "Novedades", type: "devlog", intro: "Las últimas publicaciones.", home: true }],
  },
];

export function getSiteTemplate(key: string): SiteTemplate {
  return SITE_TEMPLATES.find((t) => t.key === key) ?? SITE_TEMPLATES[0];
}
