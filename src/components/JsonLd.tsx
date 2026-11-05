import { safeJsonLd, type JsonLdNode } from "@/lib/seo";

/** Datos estructurados para Google y las IA (schema.org en formato JSON-LD). */
export function JsonLd({ data }: { data: JsonLdNode | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
