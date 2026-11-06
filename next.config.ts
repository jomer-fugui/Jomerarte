import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build:vercel` activa el adaptador para que Next corra los mismos chequeos que
  // hace Vercel al final del build. En Vercel esta variable no existe y no cambia nada.
  adapterPath: process.env.VERCEL_ADAPTER_CHECK
    ? path.resolve(process.cwd(), "scripts/adapter-de-vercel.mjs")
    : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [
      // Archivo de verificación de IndexNow (Bing, Yandex…): /jomer-<clave>.txt
      { source: "/:file(jomer-[a-f0-9]{32})\\.txt", destination: "/api/indexnow?file=:file" },
    ];
  },
};

export default nextConfig;
