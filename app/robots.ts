import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API uçları ve OAuth dönüşleri taranmamalı.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
