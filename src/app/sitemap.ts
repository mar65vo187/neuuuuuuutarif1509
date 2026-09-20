import type { MetadataRoute } from "next";
import { SERVICES, SITE } from "@/lib/content";
import { getActiveAdvisors } from "@/lib/queries";
import { LOCAL_PAGE_LIST } from "@/lib/local-pages";
import { CAMPAIGN_LANDINGS } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/berater`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE.url}/anfrage`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/leistungen`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/ueber-uns`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/karriere`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/freund-werben`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/faq`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const services: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${SITE.url}/leistungen/${s.slug}`,
    changeFrequency: "monthly",
    priority: s.featured ? 0.9 : 0.8,
  }));

  const localPages: MetadataRoute.Sitemap = LOCAL_PAGE_LIST.map((page) => ({
    url: `${SITE.url}/beratung/${page.slug}`,
    changeFrequency: "monthly",
    priority: 0.82,
  }));

  const campaignPages: MetadataRoute.Sitemap = CAMPAIGN_LANDINGS.map((campaign) => ({
    url: `${SITE.url}/kampagne/${campaign.slug}`,
    changeFrequency: "monthly",
    priority: campaign.slug === "business-check" ? 0.86 : 0.84,
  }));

  // Keep the core sitemap available to crawlers even if the advisor database
  // is temporarily unavailable. Dynamic advisor URLs are appended when healthy.
  try {
    const advisors = await getActiveAdvisors();
    const advisorUrls: MetadataRoute.Sitemap = advisors.map((a) => ({
      url: `${SITE.url}/berater/${a.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
      ...(a.imageUrl ? { images: [new URL(a.imageUrl, SITE.url).href] } : {}),
    }));
    return [...statics, ...services, ...localPages, ...campaignPages, ...advisorUrls];
  } catch {
    return [...statics, ...services, ...localPages, ...campaignPages];
  }
}
