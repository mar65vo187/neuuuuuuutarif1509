import { audiencePageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { AdvisorFinder } from "@/components/advisors/AdvisorFinder";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getActiveAdvisors } from "@/lib/queries";
import { AudienceFinalCta } from "@/components/home/AudienceSections";
import { resolveSiteAudience } from "@/lib/audience-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  return audiencePageMetadata("/berater" as const, await resolveSiteAudience((await searchParams).audience));
}

export default async function AdvisorsPage({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  const audience = await resolveSiteAudience((await searchParams).audience);
  const business = audience === "b2b";
  const advisors = await getActiveAdvisors();

  return (
    <>
      <PageHero
        eyebrow="Berater finden"
        title={
          <>
            Ein Mensch, der <span className="display-i font-normal text-champagne-soft">{business ? "zu Ihnen" : "zu dir"}</span> passt – nicht irgendein Kontaktformular.
          </>
        }
        text={business ? "Wählen Sie Themenfeld und Region. Sie sehen direkt, wer Ihre Anfrage fachlich begleiten kann – mit Schwerpunkten, Kontaktwegen und direkter Terminanfrage." : "Wähl dein Thema und deine Region. Du siehst direkt, wer dich begleiten kann – mit Schwerpunkten, Kontaktwegen und direkter Terminanfrage."}
        compact
      />
      <section className="bg-paper pb-24">
        <div className="container-x">
          <Suspense fallback={<div className="skeleton mt-8 h-64 rounded-[26px]" />}>
            <AdvisorFinder advisors={advisors} audience={audience} />
          </Suspense>
          <Reveal className="mt-14 rounded-[26px] border border-line bg-white p-7 sm:p-9">
            <p className="eyebrow text-electric-deep">Das Team wächst</p>
            <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold text-ink">Wir nehmen lieber wenige richtige Berater als viele schnelle.</h2>
            <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-steel">
              {business
                ? <>Jeder Berater bei TarifWerk arbeitet nach denselben Grundsätzen: verständlich erklären, anbieterübergreifend einordnen, erreichbar bleiben. Sie möchten Teil davon werden? <a href="/karriere?audience=b2b" className="font-semibold text-electric-deep underline underline-offset-2">Hier erfahren Sie mehr.</a></>
                : <>Jeder Berater bei TarifWerk arbeitet nach denselben Grundsätzen: verständlich erklären, anbieterübergreifend einordnen, erreichbar bleiben. Du möchtest Teil davon werden? <a href="/karriere?audience=b2c" className="font-semibold text-electric-deep underline underline-offset-2">Hier erfährst du mehr.</a></>}
            </p>
          </Reveal>
        </div>
      </section>
      <AudienceFinalCta audience={audience} />
    </>
  );
}
