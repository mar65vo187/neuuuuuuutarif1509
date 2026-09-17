import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/api/advisors/"],
      disallow: ["/api/", "/portal/"],
    }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
