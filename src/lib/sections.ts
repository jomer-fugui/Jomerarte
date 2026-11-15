export type FieldKey =
  | "title"
  | "subtitle"
  | "content"
  | "category"
  | "imageUrl"
  | "gallery"
  | "videoUrl"
  | "linkUrl"
  | "linkLabel"
  | "platform"
  | "price"
  | "unit"
  | "rating"
  | "location"
  | "links"
  | "code"
  | "purpose"
  | "slug";

export type Layout =
  | "services"
  | "products"
  | "recommend"
  | "bad"
  | "quotes"
  | "colmos"
  | "poems"
  | "links"
  | "songs"
  | "characters"
  | "story"
  | "devlog"
  | "inventions"
  | "prices"
  | "donations"
  | "games"
  | "cheats"
  | "files"
  | "custom";

export type GroupKey =
  | "servicios"
  | "tienda"
  | "recomendaciones"
  | "truchadas"
  | "frases"
  | "cielinfier"
  | "mas";

/** Íconos disponibles (también para las páginas que crees desde el panel). */
export const ICON_NAMES = [
  "file", "sparkles", "star", "heart", "thumbsUp", "award", "store", "cart", "package", "tag",
  "wrench", "zap", "camera", "globe", "graduation", "briefcase", "rocket", "shield", "lightbulb", "hammer",
  "cpu", "users", "quote", "question", "laugh", "feather", "music", "book", "newspaper", "megaphone",
  "image", "video", "palette", "gamepad", "swords", "flame", "skull", "alert", "ban", "link",
  "list", "download", "gift", "map", "phone", "calendar", "car", "leaf", "coffee", "home",
  "cloud", "drive", "smartphone", "code", "play", "chat", "monitor", "search",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export function isIconName(v: string): v is IconName {
  return (ICON_NAMES as readonly string[]).includes(v);
}

export interface SectionDef {
  key: string;
  path: string;
  group: GroupKey;
  navLabel: string;
  title: string;
  intro: string;
  image?: string;
  layout: Layout;
  icon: IconName;
  itemLabel: string;
  fields: Partial<Record<FieldKey, string>>;
  categories?: string[];
  categoryFree?: boolean;
  detail?: boolean;
  /** Orden y estilo de las categorías (se elige en el panel) */
  options?: PageOptions;
  hub?: false;
}

export interface HubDef {
  key: string;
  path: string;
  group: GroupKey;
  navLabel: string;
  allLabel: string;
  title: string;
  intro: string;
  image?: string;
  icon: IconName;
  children: string[];
  hub: true;
}

export type PageDef = SectionDef | HubDef;

export const GROUPS: { key: GroupKey; label: string; icon: IconName }[] = [
  { key: "servicios", label: "Servicios", icon: "wrench" },
  { key: "tienda", label: "Tienda", icon: "store" },
  { key: "recomendaciones", label: "Recomendaciones", icon: "thumbsUp" },
  { key: "truchadas", label: "No recomendable", icon: "alert" },
  { key: "frases", label: "Frases", icon: "quote" },
  { key: "cielinfier", label: "CielInfier", icon: "flame" },
  { key: "mas", label: "Más", icon: "sparkles" },
];

const SERVICE_FIELDS: SectionDef["fields"] = {
  title: "Nombre del servicio",
  subtitle: "Resumen corto",
  content: "Descripción completa",
  imageUrl: "Imagen principal",
  gallery: "Fotos y videos de trabajos realizados",
  videoUrl: "Video (YouTube o archivo)",
  price: "Precio (ej: Desde $ 15.000 / Consultar)",
  unit: "Unidad (ej: por boca, por cámara)",
  linkUrl: "Enlace externo (opcional)",
  linkLabel: "Texto del botón del enlace",
  links: "Botones adicionales (descargas, catálogos, redes…)",
};

const PRODUCT_FIELDS: SectionDef["fields"] = {
  title: "Nombre del producto",
  subtitle: "Detalle corto (medida, modelo, presentación)",
  content: "Descripción",
  category: "Categoría",
  imageUrl: "Imagen del producto",
  gallery: "Más fotos o videos",
  price: "Precio",
  platform: "Plataforma donde se vende",
  linkUrl: "Enlace de compra (Mercado Libre, Hotmart, AliExpress, Amazon…)",
  linkLabel: "Texto del botón (opcional)",
  links: "Más enlaces de compra o descarga",
};

const RECOMMEND_FIELDS: SectionDef["fields"] = {
  title: "Nombre",
  subtitle: "Rubro / tipo",
  content: "¿Por qué lo recomiendas?",
  category: "Categoría",
  rating: "Puntuación",
  location: "Ubicación / dirección",
  imageUrl: "Imagen o logo",
  linkUrl: "Enlace (web, Instagram, Google Maps…)",
  linkLabel: "Texto del botón",
  links: "Más enlaces (opcional)",
};

const BAD_FIELDS: SectionDef["fields"] = {
  title: "Nombre",
  subtitle: "Rubro / tipo",
  content: "¿Qué pasó? Cuenta tu experiencia",
  category: "Categoría",
  rating: "Puntuación (1 = pésimo)",
  location: "Ubicación",
  imageUrl: "Imagen / prueba",
  gallery: "Más pruebas (fotos o videos)",
  linkUrl: "Enlace (opcional)",
};

const PRICE_FIELDS = (what: string): SectionDef["fields"] => ({
  category: "Rubro / grupo",
  title: what,
  subtitle: "Detalle (opcional)",
  unit: "Unidad (ej: por boca, por hora, rollo)",
  price: "Precio",
});

/** Trucos de juegos: el código que se copia y “para qué sirve” */
const CHEAT_FIELDS: SectionDef["fields"] = {
  title: "Nombre del juego (ej: GTA San Andreas (PC))",
  code: "Código del truco (lo que se copia)",
  purpose: "Para qué sirve (ej: Pack de armas 1)",
  content: "Detalle del truco (qué incluye, cómo se usa)",
  category: "Categoría (puedes elegir varias)",
};

/** Lista de archivos: un nombre por fila y su detalle */
const FILE_FIELDS: SectionDef["fields"] = {
  title: "Lista o grupo (ej: Lista de juegos para Windows)",
  subtitle: "Nombre del archivo",
  content: "Detalle (opcional: para qué sirve, versión, tamaño…)",
  category: "Categoría (opcional)",
};

export const FILE_CATEGORIES = [
  "Juegos",
  "Programas",
  "Sistema operativo",
  "Música",
  "Videos",
  "Libros",
  "Otros",
];

export const CHEAT_CATEGORIES = [
  "Armas",
  "Vida y salud",
  "Vehículos",
  "Dinero",
  "Policía",
  "Personaje",
  "Mundo y clima",
  "Ajustes del juego",
];

export const FRASES_CATEGORIES = [
  "Ego",
  "Consejos",
  "Reflexión",
  "Negocios",
  "Ideologías lógicas",
  "Ideologías femeninas",
  "Estupidez humana",
  "Frases estúpidas",
  "Religión",
  "Verdad/Mentira",
  "Interés propio",
  "Pobreza/Riqueza",
  "Padres/Hijos",
  "Ser común",
  "Trucos de vida",
  "Política",
];

export const POESIAS_CATEGORIES = [
  "Amor",
  "Canciones de amor",
  "Desamor",
  "Estupidez en el amor",
  "Confusión",
];

export const HUBS: HubDef[] = [
  {
    key: "servicios",
    path: "/Servicios",
    group: "servicios",
    navLabel: "Servicios",
    allLabel: "Todos los servicios",
    title: "Servicios",
    intro:
      "Instalaciones eléctricas, cámaras de seguridad, páginas web y cursos. Trabajo responsable, prolijo y con garantía.",
    image: "/images/electricista.jpg",
    icon: "wrench",
    children: ["electricista", "camaras", "web", "cursos"],
    hub: true,
  },
  {
    key: "tienda",
    path: "/Tienda",
    group: "tienda",
    navLabel: "Tienda",
    allLabel: "Toda la tienda",
    title: "Tienda Jomerarte",
    intro:
      "Materiales eléctricos, productos en Mercado Libre, productos virtuales y artículos que vendo o recomiendo en Hotmart, AliExpress, Amazon y otras plataformas.",
    image: "/images/tienda.jpg",
    icon: "store",
    children: ["tienda-electricidad", "tienda-mercadolibre", "tienda-virtuales", "tienda-otras"],
    hub: true,
  },
  {
    key: "recomendacion",
    path: "/Recomendacion",
    group: "recomendaciones",
    navLabel: "Recomendaciones",
    allLabel: "Todas las recomendaciones",
    title: "Recomendaciones",
    intro:
      "Lugares, marcas, productos, servicios y páginas que recomiendo porque los probé y cumplen lo que prometen.",
    icon: "thumbsUp",
    children: ["rec-negocios", "rec-marcas", "rec-productos", "rec-servicios", "rec-paginas"],
    hub: true,
  },
  {
    key: "truchadas",
    path: "/Truchadas",
    group: "truchadas",
    navLabel: "No recomendable",
    allLabel: "Todo lo NO recomendable",
    title: "NO recomendable",
    intro:
      "Las truchadas: lugares, marcas y servicios que NO recomiendo, basados en experiencias reales. Para que no te pase lo mismo.",
    icon: "alert",
    children: ["truchas-chantas", "truchas-productos", "truchas-servicios"],
    hub: true,
  },
];

export const SECTIONS: SectionDef[] = [
  // ───────────── Servicios
  {
    key: "electricista",
    path: "/Servicios/Electricista",
    group: "servicios",
    navLabel: "Instalaciones Eléctricas",
    title: "Instalaciones Eléctricas",
    intro:
      "Instalaciones nuevas, reparaciones, tableros, iluminación y puesta a tierra. Trabajo seguro, prolijo y garantizado.",
    image: "/images/electricista.jpg",
    layout: "services",
    icon: "zap",
    itemLabel: "servicio",
    fields: SERVICE_FIELDS,
    detail: true,
  },
  {
    key: "camaras",
    path: "/Servicios/Camaras",
    group: "servicios",
    navLabel: "Instalación de Cámaras",
    title: "Instalación de Cámaras",
    intro:
      "Cámaras de seguridad para casas y comercios: kits con grabador, cámaras WiFi, visión nocturna y monitoreo desde el celular.",
    image: "/images/camaras.jpg",
    layout: "services",
    icon: "camera",
    itemLabel: "servicio",
    fields: SERVICE_FIELDS,
    detail: true,
  },
  {
    key: "web",
    path: "/Servicios/Web",
    group: "servicios",
    navLabel: "Creación de Páginas Web",
    title: "Creación de Páginas Web",
    intro:
      "Páginas web modernas, rápidas y adaptadas a celulares para emprendedores, profesionales y comercios.",
    image: "/images/web.jpg",
    layout: "services",
    icon: "globe",
    itemLabel: "servicio",
    fields: SERVICE_FIELDS,
    detail: true,
  },
  {
    key: "cursos",
    path: "/Cursos",
    group: "servicios",
    navLabel: "Cursos",
    title: "Cursos",
    intro:
      "Aprende electricidad, instalación de cámaras y creación de páginas web con cursos prácticos, presenciales u online.",
    image: "/images/cursos.jpg",
    layout: "services",
    icon: "graduation",
    itemLabel: "curso",
    fields: {
      ...SERVICE_FIELDS,
      title: "Nombre del curso",
      platform: "Plataforma (Hotmart, Udemy, propio…)",
      linkUrl: "Enlace de inscripción / compra",
    },
    detail: true,
  },
  // ───────────── Tienda
  {
    key: "tienda-electricidad",
    path: "/Tienda/Electricidad",
    group: "tienda",
    navLabel: "Materiales eléctricos",
    title: "Materiales Eléctricos",
    intro:
      "Cables, térmicas, disyuntores, tomas, iluminación LED y herramientas. Materiales de calidad al mejor precio.",
    image: "/images/tienda.jpg",
    layout: "products",
    icon: "package",
    itemLabel: "producto",
    fields: PRODUCT_FIELDS,
    categories: ["Cables", "Térmicas y disyuntores", "Tomas y llaves", "Iluminación LED", "Herramientas", "Seguridad"],
    categoryFree: true,
    detail: true,
  },
  {
    key: "tienda-mercadolibre",
    path: "/Tienda/MercadoLibre",
    group: "tienda",
    navLabel: "Mercado Libre",
    title: "Mis productos en Mercado Libre",
    intro: "Compra con toda la seguridad de Mercado Libre: envíos a todo el país y pago protegido.",
    layout: "products",
    icon: "cart",
    itemLabel: "producto",
    fields: PRODUCT_FIELDS,
    categoryFree: true,
    detail: true,
  },
  {
    key: "tienda-virtuales",
    path: "/Tienda/Virtuales",
    group: "tienda",
    navLabel: "Productos virtuales",
    title: "Productos Virtuales",
    intro: "Cursos, e-books, plantillas y productos digitales en Hotmart, Gumroad, Udemy y más.",
    layout: "products",
    icon: "download",
    itemLabel: "producto virtual",
    fields: PRODUCT_FIELDS,
    categoryFree: true,
    detail: true,
  },
  {
    key: "tienda-otras",
    path: "/Tienda/Otras",
    group: "tienda",
    navLabel: "AliExpress y otras tiendas",
    title: "AliExpress, Amazon y otras tiendas",
    intro: "Productos que vendo o recomiendo en AliExpress, Amazon, Temu, Shein y cualquier otra plataforma.",
    layout: "products",
    icon: "store",
    itemLabel: "producto",
    fields: PRODUCT_FIELDS,
    categoryFree: true,
    detail: true,
  },
  // ───────────── Recomendaciones
  {
    key: "rec-negocios",
    path: "/Recomendacion/Negocios",
    group: "recomendaciones",
    navLabel: "Los mejores lugares para comprar",
    title: "Los mejores lugares donde comprar",
    intro: "Negocios donde te atienden bien, te asesoran con honestidad y los precios son justos.",
    layout: "recommend",
    icon: "store",
    itemLabel: "negocio",
    fields: RECOMMEND_FIELDS,
    categoryFree: true,
  },
  {
    key: "rec-marcas",
    path: "/Recomendacion/Marcas",
    group: "recomendaciones",
    navLabel: "Las mejores marcas",
    title: "Las mejores marcas",
    intro: "Marcas que uso en mis trabajos y que nunca me fallaron.",
    layout: "recommend",
    icon: "award",
    itemLabel: "marca",
    fields: RECOMMEND_FIELDS,
    categoryFree: true,
  },
  {
    key: "rec-productos",
    path: "/Recomendacion/Productos",
    group: "recomendaciones",
    navLabel: "Productos recomendados",
    title: "Productos recomendados",
    intro: "Herramientas y productos que valen cada peso.",
    layout: "recommend",
    icon: "star",
    itemLabel: "producto",
    fields: { ...RECOMMEND_FIELDS, platform: "Dónde comprarlo", price: "Precio aproximado" },
    categoryFree: true,
  },
  {
    key: "rec-servicios",
    path: "/Recomendacion/Servicios",
    group: "recomendaciones",
    navLabel: "Servicios recomendados",
    title: "Servicios de otros que recomiendo",
    intro: "Profesionales y servicios de confianza que recomiendo sin dudar.",
    layout: "recommend",
    icon: "users",
    itemLabel: "servicio",
    fields: RECOMMEND_FIELDS,
    categoryFree: true,
  },
  {
    key: "rec-paginas",
    path: "/Paginas",
    group: "recomendaciones",
    navLabel: "Las mejores páginas",
    title: "Las mejores páginas",
    intro: "Sitios web, canales y herramientas online que vale la pena visitar.",
    layout: "recommend",
    icon: "globe",
    itemLabel: "página",
    fields: { ...RECOMMEND_FIELDS, location: undefined, linkUrl: "Dirección de la página" },
    categoryFree: true,
  },
  // ───────────── No recomendable
  {
    key: "truchas-chantas",
    path: "/Truchadas/LosChantas",
    group: "truchadas",
    navLabel: "Los Chantas",
    title: "Los peores lugares para comprar",
    intro: "Lugares donde te venden caro, mal o directamente te estafan. Avisados quedan.",
    layout: "bad",
    icon: "skull",
    itemLabel: "lugar",
    fields: BAD_FIELDS,
    categoryFree: true,
  },
  {
    key: "truchas-productos",
    path: "/Truchadas/ProductoTrucho",
    group: "truchadas",
    navLabel: "Producto Trucho",
    title: "Las peores marcas",
    intro: "Marcas y productos truchos que duran menos que un suspiro. No caigas.",
    layout: "bad",
    icon: "ban",
    itemLabel: "marca o producto",
    fields: BAD_FIELDS,
    categoryFree: true,
  },
  {
    key: "truchas-servicios",
    path: "/Truchadas/ServiciosMalos",
    group: "truchadas",
    navLabel: "Servicios Malos",
    title: "Los peores servicios",
    intro: "Servicios que cobran mucho, cumplen poco y te dejan peor de lo que estabas.",
    layout: "bad",
    icon: "alert",
    itemLabel: "servicio",
    fields: BAD_FIELDS,
    categoryFree: true,
  },
  // ───────────── Frases
  {
    key: "frases",
    path: "/Frases",
    group: "frases",
    navLabel: "Frases de un Hereje",
    title: "Frases de un Hereje",
    intro: "Ego, consejos, reflexiones, negocios, política, verdades incómodas y alguna que otra estupidez.",
    layout: "quotes",
    icon: "quote",
    itemLabel: "frase",
    fields: {
      content: "Frase",
      category: "Categoría",
      title: "Título o autor (opcional)",
      imageUrl: "Imagen (opcional)",
    },
    categories: FRASES_CATEGORIES,
    categoryFree: true,
  },
  {
    key: "colmos",
    path: "/Frases/Preguntas",
    group: "frases",
    navLabel: "Preguntas",
    title: "Preguntas",
    intro: "Preguntas con respuesta sorpresa: toca cada tarjeta para descubrir la respuesta.",
    layout: "colmos",
    icon: "question",
    itemLabel: "pregunta",
    fields: { title: "Pregunta", content: "Respuesta" },
  },
  {
    key: "poesias",
    path: "/Frases/Poesias",
    group: "frases",
    navLabel: "Poesías",
    title: "Poesías",
    intro: "Amor, canciones de amor, desamor, estupidez en el amor y confusión.",
    layout: "poems",
    icon: "feather",
    itemLabel: "poesía",
    fields: {
      title: "Título",
      category: "Categoría",
      content: "Poesía (respeta los saltos de línea)",
      imageUrl: "Imagen (opcional)",
      videoUrl: "Video o audio (opcional)",
    },
    categories: POESIAS_CATEGORIES,
    categoryFree: true,
  },
  // ───────────── CielInfier
  {
    key: "cielinfier-personajes",
    path: "/Cielinfier",
    group: "cielinfier",
    navLabel: "Personajes",
    title: "CielInfier · Personajes",
    intro:
      "El anime / videojuego que estoy creando. Conoce a los personajes del Cielo, del Infierno y de los que quedaron en medio.",
    image: "/images/cielinfier.jpg",
    layout: "characters",
    icon: "swords",
    itemLabel: "personaje",
    fields: {
      title: "Nombre",
      subtitle: "Rol / raza / poder",
      category: "Bando",
      content: "Historia y personalidad",
      imageUrl: "Imagen principal",
      gallery: "Galería (bocetos, fotos y videos)",
      videoUrl: "Video destacado",
      links: "Enlaces (opcional)",
    },
    categories: ["Cielo", "Infierno", "Tierra", "Neutral"],
    categoryFree: true,
    detail: true,
  },
  {
    key: "cielinfier-historia",
    path: "/Cielinfier/historia",
    group: "cielinfier",
    navLabel: "Historia",
    title: "CielInfier · Historia",
    intro: "La historia de CielInfier, capítulo a capítulo.",
    image: "/images/cielinfier.jpg",
    layout: "story",
    icon: "book",
    itemLabel: "capítulo",
    fields: {
      subtitle: "Capítulo (ej: Capítulo 1)",
      title: "Título",
      content: "Texto de la historia",
      imageUrl: "Imagen",
      gallery: "Galería",
      videoUrl: "Video",
      links: "Enlaces (opcional)",
    },
    detail: true,
  },
  {
    key: "cielinfier-proceso",
    path: "/Cielinfier/proceso",
    group: "cielinfier",
    navLabel: "Proceso del proyecto",
    title: "CielInfier · Proceso del proyecto",
    intro: "Bocetos, pruebas, animaciones y avances del desarrollo del anime / videojuego.",
    image: "/images/cielinfier.jpg",
    layout: "devlog",
    icon: "hammer",
    itemLabel: "avance",
    fields: {
      title: "Título del avance",
      subtitle: "Fecha o etapa",
      category: "Área",
      content: "Descripción",
      imageUrl: "Imagen principal",
      gallery: "Galería (fotos y videos)",
      videoUrl: "Video",
      links: "Enlaces (opcional)",
    },
    categories: ["Guion", "Arte", "Animación", "Programación", "Música"],
    categoryFree: true,
    detail: true,
  },
  // ───────────── Más
  {
    key: "mis-paginas",
    path: "/MisPaginas",
    group: "mas",
    navLabel: "Mis páginas",
    title: "Mis páginas",
    intro: "Otras páginas, canales y redes donde publico mi trabajo.",
    layout: "links",
    icon: "link",
    itemLabel: "página",
    fields: {
      title: "Nombre",
      subtitle: "Descripción corta",
      content: "Descripción",
      imageUrl: "Imagen / captura",
      platform: "Tipo / plataforma",
      linkUrl: "Enlace",
      linkLabel: "Texto del botón",
    },
  },
  {
    key: "canciones",
    path: "/CancionesJomer",
    group: "mas",
    navLabel: "Mis canciones",
    title: "Canciones de Jomer",
    intro: "Letras, audios y videos de mis canciones.",
    layout: "songs",
    icon: "music",
    itemLabel: "canción",
    fields: {
      title: "Título",
      subtitle: "Género / año",
      content: "Letra",
      imageUrl: "Portada",
      videoUrl: "Video (YouTube) o audio (MP3)",
      platform: "Plataforma",
      linkUrl: "Escuchar en (Spotify, YouTube…)",
      links: "Más enlaces (descargar, otras plataformas…)",
    },
    detail: true,
  },
  {
    key: "inventos",
    path: "/inventos",
    group: "mas",
    navLabel: "Inventos",
    title: "Mis Inventos",
    intro: "Fotos y videos de mis inventos, prototipos e ideas locas que terminaron funcionando.",
    image: "/images/inventos.jpg",
    layout: "inventions",
    icon: "lightbulb",
    itemLabel: "invento",
    fields: {
      title: "Nombre del invento",
      subtitle: "Resumen",
      category: "Estado",
      content: "Descripción / cómo funciona",
      imageUrl: "Imagen principal",
      gallery: "Galería (fotos y videos)",
      videoUrl: "Video destacado",
      linkUrl: "Enlace (opcional)",
      links: "Botones con nombre (planos, descargas, compra…)",
    },
    categories: ["Idea", "Prototipo", "En desarrollo", "Terminado"],
    categoryFree: true,
    detail: true,
  },
  {
    key: "precios-servicios",
    path: "/PreciosServicios",
    group: "mas",
    navLabel: "Precios de servicios",
    title: "Lista de precios de Servicios",
    intro: "Precios de referencia de mis servicios. Pide tu presupuesto sin compromiso.",
    layout: "prices",
    icon: "list",
    itemLabel: "precio",
    fields: PRICE_FIELDS("Servicio"),
    categoryFree: true,
  },
  {
    key: "precios-productos",
    path: "/PreciosProductos",
    group: "mas",
    navLabel: "Precios de productos",
    title: "Lista de precios de Productos",
    intro: "Precios de referencia de los productos y materiales que vendo.",
    layout: "prices",
    icon: "tag",
    itemLabel: "precio",
    fields: PRICE_FIELDS("Producto"),
    categoryFree: true,
  },
  {
    key: "donacion",
    path: "/Donacion",
    group: "mas",
    navLabel: "Donaciones",
    title: "Apoya mis proyectos",
    intro:
      "Si te gusta lo que hago (CielInfier, inventos, frases, canciones…) puedes ayudarme con una donación. ¡Cualquier aporte suma y se agradece de corazón!",
    layout: "donations",
    icon: "heart",
    itemLabel: "medio de donación",
    fields: {
      title: "Medio (Mercado Pago, PayPal, Cafecito…)",
      subtitle: "Alias / CBU / usuario (se puede copiar)",
      content: "Instrucciones",
      imageUrl: "Código QR o imagen",
      platform: "Plataforma",
      linkUrl: "Enlace de pago",
      linkLabel: "Texto del botón",
      links: "Otros enlaces de pago (opcional)",
    },
  },
  {
    key: "custom",
    path: "/__custom",
    group: "mas",
    navLabel: "Páginas personalizadas",
    title: "Páginas personalizadas",
    intro: "Crea páginas nuevas, elige su tipo y en qué sección del menú aparecen (por ejemplo “Emprendedores” dentro de Recomendaciones).",
    layout: "custom",
    icon: "file",
    itemLabel: "página",
    fields: {
      title: "Título de la página",
      slug: "Dirección (ej: Contacto → jomerarte.com/Contacto)",
      subtitle: "Subtítulo",
      content: "Contenido",
      imageUrl: "Imagen principal",
      gallery: "Galería (fotos y videos)",
      videoUrl: "Video",
      linkUrl: "Enlace del botón (opcional)",
      linkLabel: "Texto del botón",
    },
  },
];

export const ALL_PAGE_DEFS: PageDef[] = [...HUBS, ...SECTIONS];

export function getSection(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export function getHub(key: string): HubDef | undefined {
  return HUBS.find((h) => h.key === key);
}

export function getPageDef(key: string): PageDef | undefined {
  return ALL_PAGE_DEFS.find((p) => p.key === key);
}

const SUBNAV_GROUPS: string[][] = [
  ["frases", "colmos", "poesias"],
  ["cielinfier-personajes", "cielinfier-historia", "cielinfier-proceso"],
  ["precios-servicios", "precios-productos"],
];

/** Pestañas relacionadas con una página (hermanos dentro de su grupo) */
export function subnavFor(key: string): string[] | null {
  for (const hub of HUBS) {
    if (hub.key === key || hub.children.includes(key)) return [hub.key, ...hub.children];
  }
  for (const group of SUBNAV_GROUPS) if (group.includes(key)) return group;
  return null;
}

export function normalizePath(p: string): string {
  let s = p;
  try {
    s = decodeURIComponent(s);
  } catch {
    // ignore malformed URI
  }
  const out = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\/+$/, "");
  return out || "/";
}

const ALIASES: Record<string, string> = {
  "/tienda/elecricidad": "/Tienda/Electricidad",
  "/tienda/materiales": "/Tienda/Electricidad",
  "/tienda/aliexpress": "/Tienda/Otras",
  "/tienda/otros": "/Tienda/Otras",
  "/servicios/cursos": "/Cursos",
  "/servicios/electricidad": "/Servicios/Electricista",
  "/recomendaciones": "/Recomendacion",
  "/recomendacion/paginas": "/Paginas",
  "/recomendacion/lugares": "/Recomendacion/Negocios",
  "/norecomendable": "/Truchadas",
  "/truchadas/chantas": "/Truchadas/LosChantas",
  "/cielinfier/personajes": "/Cielinfier",
  "/frases/poesia": "/Frases/Poesias",
  "/poesias": "/Frases/Poesias",
  "/colmos": "/Frases/Preguntas",
  "/frases/colmos": "/Frases/Preguntas",
  "/preguntas": "/Frases/Preguntas",
  "/canciones": "/CancionesJomer",
  "/donaciones": "/Donacion",
  "/donar": "/Donacion",
  "/precios": "/PreciosServicios",
};

export type Resolved =
  | { kind: "hub"; hub: HubDef; canonical: string }
  | { kind: "section"; section: SectionDef; canonical: string }
  | { kind: "detail"; section: SectionDef; id: number; canonical: string };

function matchPage(norm: string): PageDef | undefined {
  const target = ALIASES[norm] ? normalizePath(ALIASES[norm]) : norm;
  return ALL_PAGE_DEFS.find((p) => p.key !== "custom" && normalizePath(p.path) === target);
}

/** Resuelve una URL (sin importar mayúsculas o acentos) a una página del sitio */
export function resolvePath(rawPath: string): Resolved | null {
  const norm = normalizePath(rawPath);
  const page = matchPage(norm);
  if (page) {
    return page.hub
      ? { kind: "hub", hub: page, canonical: page.path }
      : { kind: "section", section: page, canonical: page.path };
  }
  const m = norm.match(/^(.*)\/(\d+)(?:-[^/]*)?$/);
  if (m) {
    const base = matchPage(m[1] || "/");
    if (base && !base.hub && base.detail) {
      return { kind: "detail", section: base, id: Number(m[2]), canonical: base.path };
    }
  }
  return null;
}

export function pathOf(key: string): string {
  return getPageDef(key)?.path ?? "/";
}

const FEMININE = new Set(["frase", "poesía", "canción", "página", "marca", "marca o producto", "pregunta", "recomendación", "publicación"]);

/** “Nueva frase”, “Nuevo producto”… */
export function newItemLabel(section: Pick<SectionDef, "itemLabel">): string {
  return `${FEMININE.has(section.itemLabel) ? "Nueva" : "Nuevo"} ${section.itemLabel}`;
}

/** Categorías sugeridas para juegos (se pueden elegir varias y crear nuevas). */
export const GAME_CATEGORIES = [
  "Acción",
  "Aventura",
  "RPG",
  "Estrategia",
  "Disparos",
  "Terror",
  "Carreras",
  "Deportes",
  "Lucha",
  "Plataformas",
  "Puzzle",
  "Simulación",
  "Mundo abierto",
  "Multijugador",
  "Indie",
  "Retro",
  "Emuladores",
  "PC",
  "Android",
  "Online",
  "Offline",
];

const GAME_FIELDS: SectionDef["fields"] = {
  title: "Nombre del juego",
  subtitle: "Plataforma y versión (ej: PC · Android · v1.2)",
  category: "Categorías (puedes elegir varias)",
  content: "Descripción, requisitos e instrucciones de instalación",
  imageUrl: "Portada del juego",
  gallery: "Capturas de pantalla y videos",
  videoUrl: "Tráiler (YouTube o archivo)",
  links: "Botones de descarga (Mediafire, Google Drive, MEGA…)",
  unit: "Tamaño (ej: 1,5 GB)",
  price: "Precio (opcional: “Gratis” o el precio)",
  location: "Desarrollador / año (opcional)",
  rating: "Puntuación",
};

/* ═════════════ Páginas personalizadas (creadas desde el panel) ═════════════ */

export type PageTypeKey = "page" | Exclude<Layout, "custom">;

export interface PageTypeDef {
  key: PageTypeKey;
  label: string;
  description: string;
  icon: IconName;
  itemLabel: string;
  fields: SectionDef["fields"];
  categories?: string[];
  detail?: boolean;
}

const fieldsOf = (key: string): SectionDef["fields"] => SECTIONS.find((s) => s.key === key)?.fields ?? {};
const catsOf = (key: string): string[] | undefined => SECTIONS.find((s) => s.key === key)?.categories;

/** Tipos de página que se pueden elegir al crear una página nueva. */
export const PAGE_TYPES: PageTypeDef[] = [
  {
    key: "page",
    label: "Página libre",
    description: "Texto con formato, imagen, galería de fotos y videos y un botón. Ideal para Contacto, Sobre mí o Trabajos realizados.",
    icon: "file",
    itemLabel: "",
    fields: {},
  },
  {
    key: "games",
    label: "Juegos",
    description:
      "Catálogo de juegos con buscador, varias categorías por juego, capturas, tráiler y botones de descarga (Mediafire, Google Drive, MEGA…).",
    icon: "gamepad",
    itemLabel: "juego",
    fields: GAME_FIELDS,
    categories: GAME_CATEGORIES,
    detail: true,
  },
  {
    key: "cheats",
    label: "Trucos de juegos",
    description:
      "Un cuadro por juego con todos sus trucos: código, para qué sirve y detalle. Se pueden copiar de a uno o todos juntos, buscar por código o por para qué sirve, imprimir o guardar en PDF y descargar como archivo de texto.",
    icon: "gamepad",
    itemLabel: "truco",
    fields: CHEAT_FIELDS,
    categories: CHEAT_CATEGORIES,
  },
  {
    key: "files",
    label: "Lista de archivos",
    description:
      "Listas desplegables con nombres de archivos y su detalle, agrupadas por lista o carpeta. El visitante puede copiar cada nombre, descargar la lista completa en un archivo de texto o imprimirla / guardarla en PDF.",
    icon: "list",
    itemLabel: "archivo",
    fields: FILE_FIELDS,
    categories: FILE_CATEGORIES,
  },
  {
    key: "recommend",
    label: "Recomendaciones",
    description: "Negocios, marcas, páginas o servicios que recomiendas, con estrellas, ubicación y enlace.",
    icon: "thumbsUp",
    itemLabel: "recomendación",
    fields: RECOMMEND_FIELDS,
  },
  {
    key: "products",
    label: "Productos / tienda",
    description: "Productos con foto, precio y botón de compra (Mercado Libre, Hotmart, AliExpress, Amazon…).",
    icon: "package",
    itemLabel: "producto",
    fields: PRODUCT_FIELDS,
    detail: true,
  },
  {
    key: "services",
    label: "Servicios o cursos",
    description: "Servicios con descripción, fotos, precio y botón de consulta por WhatsApp.",
    icon: "wrench",
    itemLabel: "servicio",
    fields: SERVICE_FIELDS,
    detail: true,
  },
  {
    key: "bad",
    label: "No recomendable",
    description: "Lugares, marcas o servicios que NO recomiendas, con tu experiencia y pruebas.",
    icon: "alert",
    itemLabel: "elemento",
    fields: BAD_FIELDS,
  },
  {
    key: "quotes",
    label: "Frases",
    description: "Muro de frases con categorías y botones para copiar y compartir.",
    icon: "quote",
    itemLabel: "frase",
    fields: fieldsOf("frases"),
    categories: catsOf("frases"),
  },
  {
    key: "poems",
    label: "Poesías o letras",
    description: "Textos que respetan los saltos de línea, con categorías y audio o video opcional.",
    icon: "feather",
    itemLabel: "poesía",
    fields: fieldsOf("poesias"),
    categories: catsOf("poesias"),
  },
  {
    key: "colmos",
    label: "Preguntas y respuestas",
    description: "Tarjetas con una pregunta que, al tocarlas, muestran la respuesta.",
    icon: "question",
    itemLabel: "pregunta",
    fields: fieldsOf("colmos"),
  },
  {
    key: "inventions",
    label: "Publicaciones con galería",
    description: "Proyectos, trabajos realizados o inventos con fotos, videos y página propia.",
    icon: "lightbulb",
    itemLabel: "publicación",
    fields: { ...fieldsOf("inventos"), title: "Título", category: "Categoría o estado (opcional)" },
    categories: catsOf("inventos"),
    detail: true,
  },
  {
    key: "devlog",
    label: "Diario de avances",
    description: "Avances con fecha o etapa, como el proceso de un proyecto.",
    icon: "hammer",
    itemLabel: "avance",
    fields: fieldsOf("cielinfier-proceso"),
    categories: catsOf("cielinfier-proceso"),
    detail: true,
  },
  {
    key: "characters",
    label: "Personajes",
    description: "Fichas de personajes con imagen, bando, historia y galería.",
    icon: "swords",
    itemLabel: "personaje",
    fields: fieldsOf("cielinfier-personajes"),
    categories: catsOf("cielinfier-personajes"),
    detail: true,
  },
  {
    key: "story",
    label: "Historia por capítulos",
    description: "Capítulos en línea de tiempo, cada uno con su propia página.",
    icon: "book",
    itemLabel: "capítulo",
    fields: fieldsOf("cielinfier-historia"),
    detail: true,
  },
  {
    key: "songs",
    label: "Canciones",
    description: "Letras con audio o video de YouTube y enlace a Spotify u otras plataformas.",
    icon: "music",
    itemLabel: "canción",
    fields: fieldsOf("canciones"),
    detail: true,
  },
  {
    key: "links",
    label: "Enlaces a otras páginas",
    description: "Tarjetas con enlaces a otras webs, redes sociales o canales.",
    icon: "link",
    itemLabel: "enlace",
    fields: fieldsOf("mis-paginas"),
  },
  {
    key: "prices",
    label: "Lista de precios",
    description: "Tabla de precios agrupada por rubro, lista para imprimir o guardar en PDF.",
    icon: "list",
    itemLabel: "precio",
    fields: PRICE_FIELDS("Servicio o producto"),
  },
  {
    key: "donations",
    label: "Medios de pago o donación",
    description: "Alias, CBU o usuario para copiar, código QR y enlace de pago.",
    icon: "heart",
    itemLabel: "medio de pago",
    fields: fieldsOf("donacion"),
  },
];

export function getPageType(key: string): PageTypeDef {
  return PAGE_TYPES.find((t) => t.key === key) ?? PAGE_TYPES[0];
}

/** Tipo sugerido según dónde se ubica la página (siempre se puede cambiar). */
export const SUGGESTED_TYPE: Record<GroupKey, PageTypeKey> = {
  servicios: "services",
  tienda: "products",
  recomendaciones: "recommend",
  truchadas: "bad",
  frases: "quotes",
  cielinfier: "page",
  mas: "page",
};

/** Dirección base de cada sección: “Emprendedores” en Recomendaciones → /Recomendacion/Emprendedores */
export const GROUP_BASE: Record<GroupKey, string> = {
  servicios: "/Servicios",
  tienda: "/Tienda",
  recomendaciones: "/Recomendacion",
  truchadas: "/Truchadas",
  frases: "/Frases",
  cielinfier: "/Cielinfier",
  mas: "",
};

export function isGroupKey(v: string): v is GroupKey {
  return GROUPS.some((g) => g.key === v);
}

export function groupLabel(key: string): string {
  return GROUPS.find((g) => g.key === key)?.label ?? "Más";
}

/** “Mis trabajos eléctricos” → “MisTrabajosElectricos” */
export function slugFromTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .slice(0, 60);
}

/** Deja solo letras, números y guiones (respeta mayúsculas). */
export function cleanSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function customPagePath(group: string, slug: string): string {
  const base = isGroupKey(group) ? GROUP_BASE[group] : "";
  return `${base}/${slug}`;
}

export function customKey(id: number): string {
  return `c${id}`;
}

export interface CustomPageRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  pageType: string;
  menuGroup: string;
  icon: string;
  options?: unknown;
}

export interface CustomPageInfo {
  key: string;
  type: PageTypeDef;
  group: GroupKey;
  path: string;
  icon: IconName;
  /** Definición de la lista (null si es una “Página libre”) */
  def: SectionDef | null;
  /** Solo subdominios: nombre de la sección del menú donde se agrupa ("" = enlace directo en el menú) */
  menuLabel: string;
}

/**
 * Calcula tipo, ubicación y dirección de una página creada desde el panel.
 *  - Sitio principal: va dentro de una sección fija (Recomendaciones → /Recomendacion/Emprendedores).
 *  - Subdominio: la dirección es directa (/Torneos) y la sección del menú es un texto libre.
 */
export function describeCustomPage(rec: CustomPageRecord, mainSite = true): CustomPageInfo {
  const type = getPageType(rec.pageType || "page");
  const group: GroupKey = mainSite && isGroupKey(rec.menuGroup) ? rec.menuGroup : "mas";
  const slug = rec.slug || `Pagina-${rec.id}`;
  const path = mainSite ? customPagePath(group, slug) : `/${slug}`;
  const menuLabel = mainSite ? "" : (rec.menuGroup || "").trim();
  const icon: IconName = isIconName(rec.icon) ? rec.icon : type.icon;
  const key = customKey(rec.id);
  const name = rec.title || rec.slug;
  const def: SectionDef | null =
    type.key === "page"
      ? null
      : {
          key,
          path,
          group,
          navLabel: name,
          title: name,
          intro: rec.subtitle,
          image: rec.imageUrl || undefined,
          layout: type.key,
          icon,
          itemLabel: type.itemLabel,
          fields: type.fields,
          categories: type.categories,
          categoryFree: true,
          detail: type.detail,
          options: cleanPageOptions(rec.options),
        };
  return { key, type, group, path, icon, def, menuLabel };
}

const GROUP_TABS: Partial<Record<GroupKey, string[]>> = {
  frases: ["frases", "colmos", "poesias"],
  cielinfier: ["cielinfier-personajes", "cielinfier-historia", "cielinfier-proceso"],
};

/** Pestañas base de cada sección del menú (las páginas nuevas se agregan al final). */
export function groupTabKeys(group: GroupKey): string[] | null {
  const hub = HUBS.find((h) => h.group === group);
  if (hub) return [hub.key, ...hub.children];
  return GROUP_TABS[group] ?? null;
}

/* ═════════════ Opciones de cada página: orden y estilo de las categorías ═════════════ */

/** alpha = A→Z · count = más usadas primero · custom = orden elegido a mano */
export type CatSort = "alpha" | "count" | "custom";
/** slider = una fila deslizable · dropdown = botón desplegable · chips = todas visibles */
export type CatStyle = "slider" | "dropdown" | "chips";
export type PageOptions = { catSort?: CatSort; catOrder?: string[]; catStyle?: CatStyle };

const CAT_SORTS: readonly string[] = ["alpha", "count", "custom"];
const CAT_STYLES: readonly string[] = ["slider", "dropdown", "chips"];

/** Valida las opciones guardadas (vienen de la base o de un formulario). */
export function cleanPageOptions(raw: unknown): PageOptions {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: PageOptions = {};
  if (typeof o.catSort === "string" && CAT_SORTS.includes(o.catSort)) out.catSort = o.catSort as CatSort;
  if (typeof o.catStyle === "string" && CAT_STYLES.includes(o.catStyle)) out.catStyle = o.catStyle as CatStyle;
  if (Array.isArray(o.catOrder)) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of o.catOrder) {
      if (typeof c !== "string") continue;
      const v = c.replace(/\s+/g, " ").trim().slice(0, 60);
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      list.push(v);
      if (list.length >= 300) break;
    }
    out.catOrder = list;
  }
  return out;
}

/** Ordena las categorías según lo elegido para la página (por defecto, alfabético). */
export function sortCategories(names: string[], countOf: (name: string) => number, options: PageOptions = {}): string[] {
  const alpha = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
  const list = [...names];
  if (options.catSort === "count") return list.sort((a, b) => countOf(b) - countOf(a) || alpha(a, b));
  if (options.catSort === "custom") {
    const rank = new Map((options.catOrder ?? []).map((c, i) => [c.toLowerCase(), i] as const));
    const pos = (c: string) => rank.get(c.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return list.sort((a, b) => pos(a) - pos(b) || alpha(a, b));
  }
  return list.sort(alpha);
}
