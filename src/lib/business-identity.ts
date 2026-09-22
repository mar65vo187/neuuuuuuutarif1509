import { SITE } from "@/lib/content";

const DEFAULT_BUSINESS_ADDRESS = "Karawankenstraße 1, 65187 Wiesbaden, Deutschland";

export function publicBusinessAddress() {
  return process.env.BUSINESS_ADDRESS?.trim() || DEFAULT_BUSINESS_ADDRESS;
}

export function hasProductionBusinessAddress() {
  return Boolean(process.env.BUSINESS_ADDRESS?.trim() || DEFAULT_BUSINESS_ADDRESS);
}


export function publicBusinessPostalAddress() {
  const raw = publicBusinessAddress();
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const streetAddress = parts[0] || raw;
  const postalCity = parts[1] || "";
  const match = postalCity.match(/^(\d{5})\s+(.+)$/);
  const postalCode = match?.[1] ?? undefined;
  const addressLocality = match?.[2]?.trim() || SITE.hq;
  const countryPart = parts.at(-1)?.toLowerCase() ?? "";
  const addressCountry = countryPart.includes("deutsch") || countryPart === "de" ? "DE" : "DE";
  return {
    streetAddress,
    postalCode,
    addressLocality,
    addressRegion: "Hessen",
    addressCountry,
  };
}
