import { AI_POLICIES, BUSINESS_TYPES, COUNTRIES } from "./seo";

export const DEFAULT_SETTINGS = {
  siteName: "Jomerarte",
  tagline: "Electricidad · Cámaras · Páginas Web · Cursos · Arte",
  accentColor: "#b3121f",
  logoUrl: "",
  logoLightUrl: "",
  footerText:
    "Electricidad, seguridad, tecnología, inventos y arte. Hecho con pasión por Jomer Worrhis.",
  heroTitle: "Energía, seguridad y creatividad con sello propio",
  heroText:
    "Soy Jomer: electricista, instalador de cámaras, creador de páginas web, inventor y artista. Aquí encontrarás mis servicios, mi tienda, mis frases, mis inventos y el universo de CielInfier.",
  heroImage: "/images/hero.jpg",
  aboutTitle: "¿Quién es Jomer?",
  aboutText:
    "Trabajo con la electricidad desde hace años y me apasiona crear: instalaciones seguras, sistemas de cámaras, páginas web, inventos, canciones, poesías y hasta un anime / videojuego propio.\n\nCada trabajo lo hago con responsabilidad, prolijidad y honestidad. Si necesitas algo, escríbeme y lo vemos juntos.",
  aboutImage: "",
  whatsapp: "",
  whatsappMessage: "Hola Jomer, vi tu página Jomerarte y quiero consultar por",
  phone: "",
  email: "contacto@jomerarte.com",
  address: "",
  hours: "Lunes a sábado de 8 a 20 hs",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  twitter: "",
  telegram: "",
  storeMercadoLibre: "",
  storeHotmart: "",
  storeAliExpress: "",
  storeAmazon: "",
  storeOther: "",
  storeOtherLabel: "",
  pricesNote:
    "Los precios son de referencia y pueden variar según el trabajo, los materiales y la distancia. Consulta sin compromiso.",
  homePage: "",
  copyrightName: "Jomer Worrhis",
  /* Ubicación y zona de trabajo (Google, Google Maps y asistentes con IA) */
  businessType: "Electrician",
  ownerName: "Jomer",
  streetAddress: "",
  city: "",
  region: "",
  postalCode: "",
  country: "AR",
  serviceArea: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  openingHours: "",
  priceRange: "",
  /* Google e inteligencia artificial */
  seoTitle: "",
  seoDescription: "",
  aiPolicy: "all",
  googleVerification: "",
  bingVerification: "",
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export type SettingField = {
  key: SettingKey;
  label: string;
  type: "text" | "textarea" | "color" | "image" | "url" | "email" | "tel" | "page" | "select" | "hours";
  hint?: string;
  /** Opciones de las listas desplegables */
  options?: readonly { value: string; label: string }[];
  /** Solo para el sitio principal o solo para los subdominios */
  only?: "main" | "sub";
};

export type SettingsGroup = {
  /** Ancla para enlazar directo a la sección (/admin/ajustes#ubicacion) */
  id: string;
  title: string;
  description?: string;
  only?: "main" | "sub";
  fields: SettingField[];
};

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "identidad",
    title: "Identidad y logo",
    description: "Nombre, eslogan, logo y color principal del sitio.",
    fields: [
      { key: "siteName", label: "Nombre del sitio", type: "text" },
      { key: "tagline", label: "Eslogan", type: "text" },
      {
        key: "logoUrl",
        label: "Logo principal (para fondo oscuro)",
        type: "image",
        hint: "Sube aquí tu logo (PNG con fondo transparente ideal). Si lo dejas vacío se usa el logo dibujado por defecto.",
      },
      {
        key: "logoLightUrl",
        label: "Logo con fondo blanco (versión clara)",
        type: "image",
        hint: "Se muestra dentro de un círculo blanco en la portada, el pie de página y “Sobre mí”. Si solo tienes la versión con fondo blanco, súbela aquí.",
      },
      { key: "accentColor", label: "Color principal", type: "color", hint: "El rojo del logo por defecto: #b3121f" },
      { key: "footerText", label: "Texto del pie de página", type: "textarea" },
      {
        key: "copyrightName",
        label: "Nombre en el copyright del pie de página",
        type: "text",
        hint: "Aparece como “© 2026 Nombre del sitio · Jomer Worrhis”. Déjalo vacío para no mostrarlo.",
      },
    ],
  },
  {
    id: "portada",
    title: "Portada (Inicio)",
    fields: [
      { key: "heroTitle", label: "Título principal", type: "text" },
      { key: "heroText", label: "Texto de bienvenida", type: "textarea" },
      { key: "heroImage", label: "Imagen de fondo de la portada", type: "image" },
      { key: "aboutTitle", label: "Título de la sección “Sobre mí”", type: "text" },
      { key: "aboutText", label: "Texto “Sobre mí”", type: "textarea" },
      { key: "aboutImage", label: "Foto “Sobre mí” (opcional)", type: "image" },
      {
        key: "homePage",
        label: "Página que se muestra en la portada",
        type: "page",
        only: "sub",
        hint: "Su contenido aparece en la portada, debajo del título (por ejemplo el muro de frases o los personajes).",
      },
    ],
  },
  {
    id: "contacto",
    title: "Contacto",
    fields: [
      {
        key: "whatsapp",
        label: "WhatsApp",
        type: "tel",
        hint: "Con código de país, solo números. Ej: 5491122334455. Activa los botones de WhatsApp en todo el sitio.",
      },
      { key: "whatsappMessage", label: "Mensaje inicial de WhatsApp", type: "text" },
      { key: "phone", label: "Teléfono", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      {
        key: "address",
        label: "Ubicación que se muestra en el sitio",
        type: "text",
        hint: "Ej: Zona sur, Buenos Aires. Si lo dejas vacío se muestra la ciudad y la provincia de “Ubicación y zona de trabajo”.",
      },
      {
        key: "hours",
        label: "Horario de atención (texto que se muestra)",
        type: "text",
        hint: "Si lo dejas vacío, se arma solo con los horarios de “Ubicación y zona de trabajo”.",
      },
    ],
  },
  {
    id: "ubicacion",
    title: "Ubicación y zona de trabajo",
    description:
      "Ayuda a Google, Google Maps y a los asistentes con IA (ChatGPT, Gemini, Copilot, Perplexity…) a recomendarte cuando alguien busca lo que haces en tu zona.",
    fields: [
      {
        key: "businessType",
        label: "¿Qué tipo de sitio es?",
        type: "select",
        options: BUSINESS_TYPES,
        hint: "Si atiendes clientes en una zona (como electricista), elige un tipo de negocio local.",
      },
      { key: "ownerName", label: "Tu nombre (autor de las publicaciones)", type: "text" },
      { key: "city", label: "Ciudad o localidad", type: "text", hint: "Ej: Quilmes" },
      { key: "region", label: "Provincia o estado", type: "text", hint: "Ej: Buenos Aires" },
      { key: "country", label: "País", type: "select", options: COUNTRIES.map((c) => ({ value: c.code, label: c.name })) },
      { key: "postalCode", label: "Código postal (opcional)", type: "text" },
      {
        key: "streetAddress",
        label: "Calle y número (opcional)",
        type: "text",
        hint: "Déjalo vacío si trabajas a domicilio y no quieres mostrar tu dirección.",
      },
      {
        key: "serviceArea",
        label: "Zonas donde trabajas",
        type: "textarea",
        hint: "Separadas por comas. Ej: Quilmes, Bernal, Berazategui, Florencio Varela, Avellaneda, CABA",
      },
      {
        key: "mapsUrl",
        label: "Enlace de tu ficha en Google Maps",
        type: "url",
        hint: "Abre tu Perfil de Empresa en Google Maps → Compartir → Copiar enlace. Si el enlace trae las coordenadas, se usan solas.",
      },
      { key: "latitude", label: "Latitud (opcional)", type: "text", hint: "Ej: -34.72041" },
      {
        key: "longitude",
        label: "Longitud (opcional)",
        type: "text",
        hint: "En Google Maps, haz clic derecho sobre tu ubicación y toca los números para copiarlos.",
      },
      { key: "openingHours", label: "Horarios de atención (para Google y las IA)", type: "hours" },
      { key: "priceRange", label: "Rango de precios (opcional)", type: "text", hint: "Ej: $$ o “Desde $ 12.000”" },
    ],
  },
  {
    id: "google-ia",
    title: "Google e inteligencia artificial",
    description: "Cómo aparece tu sitio en Google, Bing y en los asistentes con IA.",
    fields: [
      {
        key: "seoTitle",
        label: "Título en Google (opcional)",
        type: "text",
        hint: "Hasta ~60 letras, con lo que haces y dónde. Ej: Electricista en Quilmes y zona sur · Jomerarte. Vacío = nombre y eslogan.",
      },
      {
        key: "seoDescription",
        label: "Descripción para Google y las IA",
        type: "textarea",
        hint: "120 a 160 letras: qué haces, dónde y para quién. Ej: Electricista en Quilmes y zona sur: instalaciones, tableros, cámaras de seguridad y páginas web. Presupuestos por WhatsApp.",
      },
      {
        key: "aiPolicy",
        label: "Asistentes con IA (ChatGPT, Gemini, Claude, Perplexity…)",
        type: "select",
        options: AI_POLICIES,
        hint: "“Sin entrenar modelos” bloquea a GPTBot, ClaudeBot, CCBot y similares, pero deja que ChatGPT, Claude y Perplexity te busquen y recomienden. Gemini usa el mismo permiso para responder y para entrenar, así que se mantiene permitido.",
      },
      {
        key: "googleVerification",
        label: "Código de verificación de Google Search Console",
        type: "text",
        hint: "En Search Console elige el método “Etiqueta HTML” y pega aquí el código (o la etiqueta completa).",
      },
      {
        key: "bingVerification",
        label: "Código de verificación de Bing Webmaster Tools",
        type: "text",
        hint: "Bing alimenta a ChatGPT y a Copilot. Pega el código de la etiqueta msvalidate.01 (o la etiqueta completa).",
      },
    ],
  },
  {
    id: "redes",
    title: "Redes sociales",
    fields: [
      { key: "instagram", label: "Instagram (enlace)", type: "url" },
      { key: "facebook", label: "Facebook (enlace)", type: "url" },
      { key: "youtube", label: "YouTube (enlace)", type: "url" },
      { key: "tiktok", label: "TikTok (enlace)", type: "url" },
      { key: "twitter", label: "X / Twitter (enlace)", type: "url" },
      {
        key: "telegram",
        label: "Telegram (enlace o @usuario)",
        type: "text",
        hint: "Ej: https://t.me/tuusuario o simplemente @tuusuario. También sirve el enlace de tu canal o grupo.",
      },
    ],
  },
  {
    id: "tiendas",
    title: "Tiendas externas",
    only: "main",
    description: "Enlaces a tus perfiles o tiendas. Aparecen como botones en la página Tienda.",
    fields: [
      { key: "storeMercadoLibre", label: "Mi tienda en Mercado Libre", type: "url" },
      { key: "storeHotmart", label: "Mi perfil en Hotmart", type: "url" },
      { key: "storeAliExpress", label: "Mi tienda / lista en AliExpress", type: "url" },
      { key: "storeAmazon", label: "Mi tienda / lista en Amazon", type: "url" },
      { key: "storeOther", label: "Otra tienda (enlace)", type: "url" },
      { key: "storeOtherLabel", label: "Nombre de la otra tienda", type: "text" },
    ],
  },
  {
    id: "precios",
    title: "Listas de precios",
    fields: [{ key: "pricesNote", label: "Nota al pie de las listas de precios", type: "textarea" }],
  },
];

/** Ajustes que un subdominio nuevo copia del sitio principal al crearse (después se editan por separado). */
export const INHERITED_SETTING_KEYS: SettingKey[] = [
  "accentColor",
  "logoUrl",
  "logoLightUrl",
  "whatsapp",
  "whatsappMessage",
  "phone",
  "email",
  "address",
  "hours",
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "twitter",
  "telegram",
  "pricesNote",
  "copyrightName",
  "ownerName",
  "country",
  "city",
  "region",
  "aiPolicy",
];

/** Valores por defecto de un subdominio (para lo que todavía no se haya guardado). */
export function subsiteDefaults(slug: string): Settings {
  const name = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : DEFAULT_SETTINGS.siteName;
  return {
    ...DEFAULT_SETTINGS,
    siteName: name,
    tagline: "",
    footerText: "",
    heroTitle: name,
    heroText: "",
    heroImage: "",
    aboutTitle: "",
    aboutText: "",
    aboutImage: "",
    logoUrl: "",
    logoLightUrl: "",
    whatsapp: "",
    phone: "",
    email: "",
    address: "",
    hours: "",
    storeMercadoLibre: "",
    storeHotmart: "",
    storeAliExpress: "",
    storeAmazon: "",
    storeOther: "",
    storeOtherLabel: "",
    homePage: "",
    businessType: "Person",
    streetAddress: "",
    postalCode: "",
    serviceArea: "",
    mapsUrl: "",
    latitude: "",
    longitude: "",
    openingHours: "",
    priceRange: "",
    seoTitle: "",
    seoDescription: "",
    googleVerification: "",
    bingVerification: "",
  };
}
