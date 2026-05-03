import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/sign-in", "/sign-up"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
