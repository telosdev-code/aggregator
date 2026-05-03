import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.yahoo.com" },
      { protocol: "https", hostname: "**.coindesk.com" },
      { protocol: "https", hostname: "**.coingecko.com" },
      { protocol: "https", hostname: "**.decrypt.co" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "**.finnhub.io" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
