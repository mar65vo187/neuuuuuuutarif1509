import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle, ShieldCheck } from "lucide-react";
import { ConversionEvent } from "@/components/analytics/ConversionEvent";
import { Button } from "@/components/ui/Button";
import { SITE, whatsappLink } from "@/lib/content";
import { resolveSiteAudience } from "@/lib/audience-server";

export const metadata: Metadata = {
  title: { absolute: "Anfrage erhalten | TarifWerk" },
  description: "Die Anfrage ist bei TarifWerk eingegangen.",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[]; audience?: string | string[]; type?: string | string[] }> }) {
  const params = await searchParams;
  const rawRef = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const leadId = rawRef && /^\d{1,10}$/.test(rawRef) ? Number(rawRef) : null;
  const audience = await resolveSiteAudience(params.audience);
  const business = audience === "b2b";
  const type = ((Array.isArray(params.type) ? params.type[0] : params.type) || "beratung").slice(0, 30);

  return (
    <>
      <ConversionEvent leadId={leadId} audience={audience} type={type} />
      <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32 grain">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-electric/20 blur-[130px]" aria-hidden="true" />
        <div className="container-x relative">
          <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/[0.045] p-7 text-center shadow-soft backdrop-blur sm:p-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-electric text-white shadow-glow">
              <Check className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="eyebrow mt-6 justify-center text-electric-soft">Anfrage angekommen</p>
            <h1 className="mt-4 text-[clamp(2rem,4.8vw,3.7rem)] font-extrabold leading-[1.02]">
              Danke. <span className="display-i font-normal text-champagne-soft">Jetzt übernehmen wir.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-silver">
              {business ? "Ihre Angaben sind bei TarifWerk eingegangen. Ein Ansprechpartner prüft die Anfrage persönlich und meldet sich in der Regel innerhalb eines Tages. Terminwünsche werden ausdrücklich bestätigt." : "Deine Angaben sind bei TarifWerk eingegangen. Ein Ansprechpartner prüft deine Anfrage persönlich und meldet sich in der Regel innerhalb eines Tages. Terminwünsche bestätigen wir dir ausdrücklich."}
            </p>
            {leadId && <p className="mt-3 text-[12.5px] text-steel">Vorgangsnummer #{leadId}</p>}

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
              {(business ? [
                "Wir lesen Ihre Angaben persönlich.",
                "Offene Punkte klären wir direkt mit Ihnen.",
                "Sie entscheiden danach in Ruhe über den nächsten Schritt.",
              ] : [
                "Wir lesen deine Angaben persönlich.",
                "Offene Punkte klären wir direkt mit dir.",
                "Du entscheidest danach in Ruhe über den nächsten Schritt.",
              ]).map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-[13px] leading-relaxed text-platinum">
                  <ShieldCheck className="mb-3 h-4 w-4 text-electric-soft" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                href={whatsappLink(leadId ? `Hallo TarifWerk, ich habe gerade Anfrage #${leadId} gestellt.` : "Hallo TarifWerk, ich habe gerade eine Anfrage gestellt.")}
                target="_blank"
                variant="whatsapp"
                icon={<MessageCircle />}
              >
                Direkt per WhatsApp
              </Button>
              <Button href="/" variant="secondary" magnetic={false}>
                Zur Startseite
              </Button>
            </div>
            <p className="mt-5 text-[12px] text-steel">Direkter Kontakt: {SITE.whatsappDisplay} · {SITE.hours}</p>
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-[12.5px] text-silver">
            <Link href="/leistungen" className="hover:text-white">Leistungen ansehen</Link>
            <Link href="/faq" className="hover:text-white">Häufige Fragen</Link>
            <Link href="/ueber-uns" className="hover:text-white">Über TarifWerk</Link>
          </div>
        </div>
      </section>
    </>
  );
}
