import type { MetadataRoute } from "next";
import { SERVICES, SITE } from "@/lib/content";
import { getActiveAdvisors } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/berater`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE.url}/anfrage`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/leistungen`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/ueber-uns`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/karriere`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/freund-werben`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/faq`, changeFrequency: "monthly", priority: 0.6 },
  ];
  const services: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${SITE.url}/leistungen/${s.slug}`,
    changeFrequency: "monthly",
    priority: s.featured ? 0.9 : 0.8,
  }));
  const advisors = await getActiveAdvisors();
  const advisorUrls: MetadataRoute.Sitemap = advisors.map((a) => ({
    url: `${SITE.url}/berater/${a.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...statics, ...services, ...advisorUrls];
}
