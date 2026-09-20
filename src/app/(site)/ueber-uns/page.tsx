import { pageMetadata } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import { Founder, FinalCta, Process } from "@/components/home/Sections";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/Button";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";
import { REGIONS } from "@/lib/content";
import { resolveSiteAudience } from "@/lib/audience-server";

export const metadata = pageMetadata("/ueber-uns");

const VALUES = {
  b2c: [
    { t: "Verständlich", d: "Du verstehst Unterschiede, Kosten und nächste Schritte, bevor du dich entscheidest." },
    { t: "Nachvollziehbar", d: "Wir sagen offen, welche Kriterien zählen, welche Partner verfügbar sind und warum wir etwas empfehlen." },
    { t: "Erreichbar", d: "Dein Ansprechpartner kennt deine Situation und bleibt auch nach einer Entscheidung erreichbar." },
    { t: "Verantwortlich", d: "Wenn eine Änderung keinen Sinn ergibt, sagen wir genau das – auch ohne Abschluss." },
  ],
  b2b: [
    { t: "Verständlich", d: "Sie können Unterschiede, Kosten und nächste Schritte vor einer Entscheidung selbst nachvollziehen." },
    { t: "Nachvollziehbar", d: "Wir legen Kriterien, verfügbare Partner und die Begründung einer Empfehlung offen." },
    { t: "Erreichbar", d: "Ihr Ansprechpartner kennt die Ausgangslage und bleibt auch nach einer Entscheidung erreichbar." },
    { t: "Verantwortlich", d: "Wenn eine Änderung keinen wirtschaftlichen oder fachlichen Sinn ergibt, ist auch das ein klares Ergebnis." },
  ],
} as const;

export default async function AboutPage({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  const audience = await resolveSiteAudience((await searchParams).audience);
  const business = audience === "b2b";
  const values = VALUES[audience];
  return (
    <>
      <PageHero
        eyebrow="Über TarifWerk"
        title={
          <>
            Viele Themen. <span className="display-i font-normal text-champagne-soft">Ein Ansprechpartner.</span>
          </>
        }
        text={business ? "TarifWerk bündelt Vertrags-, Versorgungs- und weitere betriebliche Themen in einem strukturierten Beratungsprozess – mit einem direkten Ansprechpartner für Unternehmen deutschlandweit." : "TarifWerk ist in Wiesbaden entstanden, damit du Vertrags-, Versorgungs- und größere Alltagsthemen nicht jedes Mal bei einer neuen Stelle erklären musst. Ein Ansprechpartner behält den Gesamtblick."}
      />

      <section className="bg-paper py-20 sm:py-28">
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <p className="eyebrow text-electric-deep">Woran wir uns messen lassen</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-tight text-ink">Vier Prinzipien, die im Gespräch überprüfbar sind.</h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2" stagger={0.1}>
            {values.map((value, index) => (
              <Item key={value.t}>
                <div className="card-hover h-full rounded-[24px] border border-line bg-white p-7">
                  <span className="text-[13px] font-bold text-electric-deep">0{index + 1}</span>
                  <h3 className="mt-3 text-[24px] font-extrabold text-ink">{value.t}</h3>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-steel">{value.d}</p>
                </div>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      <Founder />
      <Process />

      <section className="bg-paper-2 py-20">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow text-electric-deep">Wo wir beraten</p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">Von Wiesbaden aus. Deutschlandweit erreichbar.</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-steel">
              Die Beratung kann deutschlandweit digital per Video, Telefon oder WhatsApp stattfinden. Persönliche
              Vor-Ort-Termine stimmen wir individuell ab – abhängig von Thema, Region und Verfügbarkeit.
            </p>
            <div className="mt-6">
              <Button href={`/berater?audience=${audience}`} iconRight={<ArrowRight />}>Ansprechpartner finden</Button>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-6" delay={0.1}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {REGIONS.map((region) => (
                <li key={region} className="rounded-2xl border border-line bg-white px-4 py-4 text-[14.5px] font-semibold text-ink">{region}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <FinalCta audience={audience} />
    </>
  );
}
