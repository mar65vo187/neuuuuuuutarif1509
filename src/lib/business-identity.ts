import { SITE } from "@/lib/content";

export function publicBusinessAddress() {
  return process.env.BUSINESS_ADDRESS?.trim() || `${SITE.hq}, Deutschland`;
}

export function hasProductionBusinessAddress() {
  return Boolean(process.env.BUSINESS_ADDRESS?.trim());
}
