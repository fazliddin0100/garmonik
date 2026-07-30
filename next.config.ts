import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
const legacyKassaHost = process.env.KASSA_LEGACY_HOST?.trim();

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  output: "standalone",
  async redirects() {
    if (!appUrl || !legacyKassaHost) return [];
    return [
      {
        source: "/",
        has: [{ type: "host", value: legacyKassaHost }],
        destination: `${appUrl}/kassa`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: legacyKassaHost }],
        destination: `${appUrl}/kassa/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
