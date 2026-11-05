import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/zen-dots";
import "./globals.css";
import { siteBaseUrl } from "@/lib/hosts";

/**
 * Documento base de TODO el sitio (páginas públicas y panel).
 *
 * A propósito, este archivo no consulta la base de datos ni lee cookies/cabeceras: así las páginas
 * públicas pueden servirse desde la caché. Los datos de cada sitio (colores, idioma, SEO, nombre)
 * se aplican en `src/app/(site)/h/[site]/layout.tsx`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl() ?? "https://jomerarte.com"),
  applicationName: "Jomerarte",
  title: { default: "Jomerarte", template: "%s" },
  formatDetection: { telephone: true, address: true, email: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
