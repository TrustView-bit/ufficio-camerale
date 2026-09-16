import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // solo la matrice di combinazioni query/provincia/pagina va bloccata:
      // la Home Ricerca nuda (/ricerca) resta leggibile da Googlebot
      disallow: ["/api/", "/ricerca?"],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
