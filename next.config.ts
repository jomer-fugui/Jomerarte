import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
