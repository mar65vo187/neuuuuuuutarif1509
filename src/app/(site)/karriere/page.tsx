import { pageMetadata } from "@/lib/seo";
import { BadgeEuro, Car, Check, Dumbbell, GraduationCap, PiggyBank, Plane, TrendingUp, UsersRound, X } from "lucide-react";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { PageHero } from "@/components/site/PageHero";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";

export const metadata = pageMetadata("/karriere");

const EXPECT = [
  { t: "Echte Verantwortung", d: "Sie begleiten Menschen in Entscheidungen, die zählen – von Internet bis Immobilie." },
  { t: "Kein Skript", d: "Sie beraten so, wie Sie selbst beraten werden möchten. Zeit ist bei uns kein Kostenfaktor, sondern Qualität." },
  { t: "Rückhalt", d: "Erfahrung, Abstimmung und ein offenes Ohr – vom ersten Tag an. Sie sind nicht allein." },
];

const FITS = ["Sie mögen den ehrlichen Kontakt mit Menschen", "Sie können Komplexes verständlich machen", "Sie sagen auch einmal „nicht abschließen“", "Sie arbeiten selbstständig und zuverlässig"];
const NOT = ["Sie wollen Produkte losschieben, ohne zuzuhören", "Sie versprechen gern alles, was gehört werden will", "Sie arbeiten mit künstlichem Zeitdruck"];

const BENEFITS = [
  { icon: BadgeEuro, title: "Attraktive Provisionen", text: "Ein transparentes Entwicklungsmodell belohnt Leistung, Qualität, Zuverlässigkeit und zusätzliche Verantwortung." },
  { icon: TrendingUp, title: "Echter Karrierepfad", text: "Vom Einstieg über Senior- und Builder-Stufen bis hin zu Teamverantwortung – Entwicklung soll nachvollziehbar statt willkürlich sein." },
  { icon: UsersRound, title: "Fairer Teamaufbau", text: "Wer Menschen entwickelt und Verantwortung übernimmt, kann eine eigene Struktur aufbauen. Mehrleistung wird transparent berücksichtigt." },
  { icon: GraduationCap, title: "Schulungen & Coaching", text: "Produktwissen, Beratung, Gesprächsführung, Prozesse und Qualität werden regelmäßig trainiert – nicht nur am ersten Tag." },
  { icon: Plane, title: "Reisen & Team-Events", text: "Gemeinsame Erlebnisse, Incentives und Teamreisen können je nach Zielerreichung und Programm Teil des Modells sein." },
  { icon: Car, title: "Mobilitäts-Benefits", text: "Je nach Rolle und Stufe sind Mobilitätslösungen bis hin zu einem gebrandeten TarifWerk-Firmenfahrzeug möglich." },
  { icon: PiggyBank, title: "Langfristige Vorsorge", text: "Interne Treue- und Vorsorgebausteine sollen langfristigen Aufbau belohnen und können einen zusätzlichen Investment-/Sparbaustein enthalten." },
  { icon: Dumbbell, title: "Wellpass & Gesundheit", text: "Gesundheits- und Fitnessbenefits wie Wellpass können je nach Beschäftigungsmodell, Rolle und Verfügbarkeit angeboten werden." },
];

export default function CareerPage() {
  return (
    <>
      <PageHero
        eyebrow="Karriere"
        title={
          <>
            Beraten, wie Sie selbst <span className="display-i font-normal text-champagne-soft">beraten werden möchten.</span>
          </>
        }
        text="Wir suchen Menschen, die zuhören können, gern erklären und Ambition mit Anstand verbinden. Nebenberuflich oder mit voller Kraft – das klären wir im Gespräch."
      />

      <section className="bg-paper py-20 sm:py-28">
        <div className="container-x">
          <Stagger className="grid gap-4 md:grid-cols-3" stagger={0.1}>
            {EXPECT.map((e, i) => (
              <Item key={e.t}>
                <div className="card-hover h-full rounded-[24px] border border-line bg-white p-7">
                  <span className="text-[13px] font-bold text-electric-deep">0{i + 1}</span>
                  <h2 className="mt-3 text-[22px] font-extrabold text-ink">{e.t}</h2>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-steel">{e.d}</p>
                </div>
              </Item>
            ))}
          </Stagger>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="rounded-[24px] border border-line bg-white p-7">
                <h3 className="text-[18px] font-extrabold text-ink">Passt zu uns</h3>
                <ul className="mt-4 space-y-3">
                  {FITS.map((f) => <li key={f} className="flex gap-3 text-[15px] text-ink-700"><Check className="mt-1 h-4 w-4 shrink-0 text-electric-deep" />{f}</li>)}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-[24px] border border-line bg-paper-2 p-7">
                <h3 className="text-[18px] font-extrabold text-ink">Passt eher nicht</h3>
                <ul className="mt-4 space-y-3">
                  {NOT.map((f) => <li key={f} className="flex gap-3 text-[15px] text-steel"><X className="mt-1 h-4 w-4 shrink-0 text-steel" />{f}</li>)}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-white sm:py-28">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow justify-center text-electric-soft">Mehr als nur Provision</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-tight">Leistung soll sich lohnen. <span className="display-i font-normal text-champagne-soft">Und Entwicklung auch.</span></h2>
            <p className="mt-4 text-[15px] leading-relaxed text-silver">Wir wollen ein Umfeld, in dem gute Beratung, Eigeninitiative und Teamaufbau sichtbar belohnt werden – mit einem klaren Karrierepfad und Benefits, die mit Verantwortung wachsen.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass rounded-[24px] p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-electric-soft"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-[17px] font-extrabold">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-silver">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[26px] border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="eyebrow text-electric-soft">Karrierepfad</p>
                <h3 className="mt-3 text-[24px] font-extrabold">Wachsen ohne Ellbogen-System.</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-silver">Stufen orientieren sich an Beratungsqualität, nachhaltiger Leistung, Zuverlässigkeit, Stornoqualität und Teambeitrag. Einzelne Monate entscheiden nicht allein über Entwicklung.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["01", "Einstieg", "Lernen & sauber beraten"],
                  ["02", "Professional", "Stabile Qualität & Leistung"],
                  ["03", "Builder", "Menschen entwickeln"],
                  ["04", "Teamlead", "Verantwortung übernehmen"],
                ].map(([step, title, text]) => <div key={step} className="rounded-2xl border border-white/10 bg-black/10 p-4"><p className="text-[11px] font-bold text-electric-soft">{step}</p><p className="mt-2 font-bold">{title}</p><p className="mt-1 text-[11.5px] leading-relaxed text-silver">{text}</p></div>)}
              </div>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-4xl text-center text-[11.5px] leading-relaxed text-silver">Welche Benefits konkret gelten, hängt von Rolle, Stufe, Beschäftigungs-/Kooperationsmodell, Zielerreichung, Verfügbarkeit und individueller Vereinbarung ab. Details werden vor einer Zusage transparent besprochen.</p>
        </div>
      </section>

      <section className="bg-paper-2 py-20 sm:py-28" id="bewerben">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow text-electric-deep">Bewerbung</p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">Erzählen Sie uns kurz, wer Sie sind.</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-steel">Zwei Minuten reichen. Wir melden uns persönlich – und klären in einem kurzen Gespräch, ob und wie wir zusammenpassen.</p>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={0.1}>
            <div className="rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
              <ApplicationForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
