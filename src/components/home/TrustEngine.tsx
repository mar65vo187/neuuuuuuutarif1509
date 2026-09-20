import { ArrowRight, CheckCircle2, Compass, Handshake, Layers3, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { withAudience, type AudienceMode } from "@/lib/audience";

const USPS = [
  {
    icon: UserRoundCheck,
    title: "Ein Ansprechpartner",
    text: "Nicht für jedes Thema eine neue Hotline: Ein fester Kontakt kennt die Ausgangslage und denkt Zusammenhänge mit.",
  },
  {
    icon: Layers3,
    title: "Mehrere Themen. Ein System.",
    text: "Tarife, Energie, Absicherung und weitere Bereiche werden dort verbunden, wo ein Gesamtblick wirklich sinnvoll ist.",
  },
  {
    icon: Compass,
    title: "Bedarf vor Produkt",
    text: "Wir beginnen nicht mit einem Tarif. Zuerst klären wir Situation, Prioritäten, Kosten, Laufzeit und Umsetzbarkeit.",
  },
  {
    icon: Handshake,
    title: "Partner transparent",
    text: "TarifWerk arbeitet mit verschiedenen Marktteilnehmern, aber nicht mit jedem Anbieter. Welche Optionen verfügbar sind, sagen wir offen.",
  },
  {
    icon: ShieldCheck,
    title: "Kein Abschlusszwang",
    text: "Es gibt eine klare Einschätzung und konkrete Möglichkeiten – ohne automatische Entscheidung und ohne Abschlusszwang.",
  },
  {
    icon: Sparkles,
    title: "Begleitung danach",
    text: "Gute Beratung endet nicht mit der Unterschrift. Bei Rückfragen und nächsten Schritten bleibt derselbe Ansprechpartner erreichbar.",
  },
] as const;

const PRINCIPLES = [
  "Keine künstliche Verknappung",
  "Keine erfundenen Rabatte",
  "Keine versteckten Vergleichsversprechen",
  "Keine Empfehlung nur wegen einer hohen Provision",
] as const;

export function TrustEngine({ audience }: { audience: AudienceMode }) {
  return (
    <section className="relative overflow-hidden border-y border-line bg-white py-20 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-electric/[0.07] blur-[120px]" />
      <div className="container-x relative">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">Was TarifWerk anders macht</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(2rem,4.5vw,3.8rem)] font-extrabold leading-[1.02] text-ink">
              Nicht mehr Produkte zeigen.
              <br />
              <span className="display-i font-normal text-ink-700">Bessere Entscheidungen ermöglichen.</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="max-w-xl text-[16px] leading-relaxed text-steel">
              Der Unterschied liegt nicht in einer lauten Werbebotschaft, sondern im Ablauf: verstehen, einordnen, Optionen erklären, sauber umsetzen und danach erreichbar bleiben.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {USPS.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="group rounded-[26px] border border-line bg-paper/65 p-6 transition duration-500 hover:-translate-y-1 hover:border-electric/20 hover:bg-white hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-electric/15 bg-electric/[0.07] text-electric-deep">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-steel/50">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-[20px] font-extrabold text-ink">{title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-steel">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 rounded-[28px] border border-ink/8 bg-ink p-6 text-white sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="eyebrow text-electric-soft">TarifWerk-Prinzip</p>
            <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-tight">
              Vertrauen entsteht auch durch das, was man bewusst nicht macht.
            </h3>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <div key={principle} className="flex items-center gap-2.5 text-[13px] text-platinum">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-electric-soft" />
                  <span>{principle}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-silver">Der nächste sinnvolle Schritt</p>
            <p className="mt-3 text-[14px] leading-relaxed text-platinum">
              Kurz das Thema schildern. Wir klären, ob und wie TarifWerk sinnvoll helfen kann – kostenfrei und unverbindlich.
            </p>
            <Link href={withAudience("/anfrage", audience)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-electric px-5 py-3 text-[13.5px] font-bold text-white transition hover:bg-electric-deep">
              Thema prüfen lassen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
