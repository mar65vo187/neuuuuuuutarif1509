import { pageMetadata } from "@/lib/seo";
import { Check } from "lucide-react";
import { LeadForm } from "@/components/forms/LeadForm";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SERVICE_NAMES, normalizeTopic } from "@/lib/content";

export const metadata = pageMetadata("/anfrage");

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ thema?: string | string[]; region?: string | string[]; ref?: string | string[]; audience?: string | string[] }> }) {
  const { thema, region, ref, audience } = await searchParams;
  const business = (Array.isArray(audience) ? audience[0] : audience) === "b2b";
  const normalized = normalizeTopic((Array.isArray(thema) ? thema[0] : thema) ?? "");
  const defaultRegion = ((Array.isArray(region) ? region[0] : region) ?? "").slice(0, 80);
  const rawReferral = Array.isArray(ref) ? ref[0] : ref;
  const referralCode = rawReferral && /^[a-f0-9]{24}$/.test(rawReferral) ? rawReferral : undefined;
  const topic = SERVICE_NAMES.includes(normalized) ? normalized : "";

  const points = business
    ? [
        "Ein Ansprechpartner prüft Ihre Angaben persönlich.",
        "Wir klären offene Anforderungen und Prioritäten mit Ihnen.",
        "Sie erhalten eine strukturierte Rückmeldung zu den nächsten Schritten.",
        "Sie entscheiden in Ruhe, ob und wie es weitergeht.",
      ]
    : [
        "Ein Berater sieht sich deine Angaben persönlich an.",
        "Du bekommst eine Rückmeldung – in der Regel innerhalb eines Tages.",
        "Terminwünsche bestätigen wir dir ausdrücklich.",
        "Du entscheidest, ob und wie es weitergeht.",
      ];

  return (
    <>
      <PageHero
        eyebrow={business ? "Business-Anfrage" : "Anfrage"}
        title={business ? (
          <>Ihre Ausgangslage. <span className="display-i font-normal text-champagne-soft">Klar strukturiert.</span></>
        ) : (
          <>Zwei Minuten. <span className="display-i font-normal text-champagne-soft">Dann weißt du mehr.</span></>
        )}
        text={business
          ? "Schildern Sie uns kurz Ihren Bedarf. Wir ordnen die Ausgangslage ein und stimmen den sinnvollsten nächsten Schritt persönlich mit Ihnen ab."
          : "Sag uns kurz, worum es geht. Wir prüfen deine Situation und melden uns persönlich – mit einer ehrlichen Einschätzung, nicht mit einem Angebotskatalog."}
        compact
      />
      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="text-[22px] font-extrabold text-ink">{business ? "Was danach passiert" : "Was danach passiert"}</h2>
            <ul className="mt-5 space-y-3 text-[15px] text-steel">
              {points.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-electric-deep" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-line bg-white p-5 text-[14px] text-steel">
              <p className="font-semibold text-ink">{business ? "Vertrauliche Bearbeitung Ihrer Anfrage." : "Keine Weitergabe deiner Daten."}</p>
              <p className="mt-1">
                {business
                  ? "Ihre Angaben werden zur Bearbeitung der Anfrage genutzt. Weitere Verarbeitung richtet sich nach den transparent erläuterten nächsten Schritten."
                  : "Deine Angaben nutzen wir ausschließlich für deine Anfrage – nichts wird verkauft, nichts landet in Newslettern."}
              </p>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={0.1}>
            <div className="rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
              <LeadForm
                key={`${topic}:${defaultRegion}:${referralCode ?? ""}:${business ? "b2b" : "b2c"}`}
                referralCode={referralCode}
                type="beratung"
                defaultTopic={topic}
                defaultRegion={defaultRegion}
                source={business ? "anfrage:b2b" : "anfrage"}
                audience={business ? "b2b" : "b2c"}
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
