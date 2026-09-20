import { cookies } from "next/headers";
import type { AudienceMode } from "@/lib/audience";

export function audienceFromParam(raw: string | string[] | undefined): AudienceMode | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "b2b") return "b2b";
  if (value === "b2c") return "b2c";
  return null;
}

export async function resolveSiteAudience(raw?: string | string[]): Promise<AudienceMode> {
  const explicit = audienceFromParam(raw);
  if (explicit) return explicit;
  const stored = (await cookies()).get("tarifwerk-audience")?.value;
  return stored === "b2b" ? "b2b" : "b2c";
}

export function audienceParam(mode: AudienceMode) {
  return mode === "b2b" ? "audience=b2b" : "audience=b2c";
}
