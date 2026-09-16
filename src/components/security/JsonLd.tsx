import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security";

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-tarifwerk-nonce") ?? undefined;
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
