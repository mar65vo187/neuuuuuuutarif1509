import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { pageMetadata } from "@/lib/seo";
import { resolveSiteAudience } from "@/lib/audience-server";
import { withAudience } from "@/lib/audience";

type Props = { searchParams: Promise<{ audience?: string | string[] }> };

const STEPS = [
  { icon: FileText, title: "Bestand strukturieren", text: "Relevante Verträge, laufende Kosten und wichtige Fristen werden geordnet in die Betreuung aufgenommen." },
  { icon: Target, title: "Ziele & Wünsche festhalten", text: "Du nennst, was du vorhast – vom neuen Tarif bis zu Solar, Immobilie, Absicherung oder Finanzierung." },
  { icon: Sparkles, title: "Optionen vergleichen", text: "Wenn passende Lösungen verfügbar sind, werden bis zu drei nachvollziehbare Optionen gegenübergestellt. Du entscheidest." },
  { icon: RefreshCw, title: "Regelmäßig prüfen", text: "Neue Wünsche und anstehende Vertragsfristen können im nächsten Review wieder aufgegriffen werden." },
] as const;

const BUSINESS_POINTS = [
  {
    icon: Building2,
    title: "Standorte & Bestände strukturieren",
    text: "Vertragsstände, Standorte und Zuständigkeiten werden zunächst sauber erfasst, bevor neue Lösungen bewertet werden.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Bedarf statt Standardpaket",
    text: "Telekommunikation, Energie, Absicherung und weitere Themen werden nach tatsächlichem Unternehmensbedarf eingeordnet.",
  },
  {
    icon: Target,
    title: "Nächste Schritte koordinieren",
    text: "Sie behalten die Freigabe. TarifWerk strukturiert Optionen und koordiniert auf Wunsch die nächsten Schritte mit verfügbaren Partnern.",
  },
] as const;

export async function generateMetadata({ searchParams }: Props) {
  const audience = await resolveSiteAudience((await searchParams).audience);
  if (audience === "b2b") {
    return pageMetadata("/optimierungsservice", {
      title: "TarifWerk für Unternehmen | Bedarf strukturiert klären",
      description: "TarifWerk strukturiert Unternehmensbedarfe rund um Telekommunikation, Energie, Absicherung und weitere Themen – individuell und transparent.",
    }, null, "/optimierungsservice");
  }
  return pageMetadata("/optimierungsservice");
}

export default async function OptimizationServicePage({ searchParams }: Props) {
  const audience = await resolveSiteAudience((await searchParams).audience);

  if (audience === "b2b") {
    return <>
      <PageHero
        eyebrow="TarifWerk für Unternehmen"
        title={<>Individuelle Bedarfsklärung statt <span className="display-i font-normal text-champagne-soft">Privatkunden-Abo.</span></>}
        text="Der 1,99-€-Optimierungsservice richtet sich aktuell an Privatkunden. Für Unternehmen strukturieren wir Bedarfe individuell – mit Blick auf Standorte, Vertragsbestände, Zuständigkeiten und verfügbare Partner."
        compact
      />

      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x">
          <div className="grid gap-4 md:grid-cols-3">
            {BUSINESS_POINTS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[24px] border border-line bg-white p-6 shadow-[0_18px_50px_-36px_rgba(6,11,22,.38)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-electric/10 text-electric-deep"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h2 className="mt-5 text-[18px] font-extrabold text-ink">{title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-steel">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] bg-ink p-6 text-white sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div>
              <p className="eyebrow text-electric-soft">Business-Anfrage</p>
              <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold">Schildern Sie kurz Ihre Ausgangslage.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-silver">Wir klären zunächst, ob TarifWerk sinnvoll unterstützen kann und welche Informationen für eine belastbare Einordnung benötigt werden.</p>
            </div>
            <Link href={withAudience("/anfrage", "b2b")} className="mt-6 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-electric px-6 text-[14px] font-extrabold text-white hover:bg-electric-deep lg:mt-0">
              Business-Anfrage starten <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>;
  }

  return <>
    <PageHero
      eyebrow="TarifWerk Optimierungsservice"
      title={<>Deine Themen im Blick. <span className="display-i font-normal text-champagne-soft">Nicht nur einmal.</span></>}
      text="Für 1,99 € pro Monat bündeln wir deine relevanten TarifWerk-Themen in einer laufenden Betreuung: Vertragsbestand, Ziele und Wünsche, passende Optionen und die Koordination der nächsten Schritte."
      compact
    />

    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8">
            <p className="eyebrow text-electric-soft">Mitgliedschaft</p>
            <div className="mt-4 flex items-end gap-2"><span className="text-[48px] font-extrabold tracking-tight">1,99 €</span><span className="pb-2 text-[13px] font-semibold text-silver">pro Monat</span></div>
            <p className="mt-4 text-[14px] leading-relaxed text-silver">Der Mitgliedsbeitrag bezahlt die laufende Organisation und Übersicht des Optimierungsservices. Produkt- oder Vermittlungsvergütungen können – je nach tatsächlichem Partner und Leistung – zusätzlich an anderer Stelle entstehen und werden transparent eingeordnet.</p>
            <Link href={withAudience("/anfrage?thema=Optimierungsservice", "b2c")} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-electric px-6 py-3 text-[14px] font-extrabold text-white hover:bg-electric-deep">Interesse anmelden <ArrowRight className="h-4 w-4" /></Link>
            <p className="mt-3 text-[11px] leading-relaxed text-silver">Die Mitgliedschaft wird erst nach bestätigter Freischaltung aktiv. Eine Anfrage allein löst keine Abbuchung aus.</p>
          </aside>

          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric-deep"><Icon className="h-5 w-5" /></span><span className="text-[10px] font-extrabold tracking-[0.16em] text-steel">0{index + 1}</span></div>
              <h2 className="mt-5 text-[18px] font-extrabold text-ink">{title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-steel">{text}</p>
            </article>)}
          </div>
        </div>
      </div>
    </section>

    <section className="bg-white py-16 sm:py-20">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <p className="eyebrow text-electric-deep">Ein System für echte Lebenssituationen</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-tight text-ink">Ein Wunsch kann mehrere Schritte brauchen.</h2>
          <p className="mt-4 text-[14px] leading-relaxed text-steel">Bei größeren Vorhaben reicht ein Produktvergleich oft nicht. Beim Wunsch nach einer Solaranlage können zum Beispiel Machbarkeit, Anbieter, Finanzierung und der weitere Ablauf zusammengehören. Der Optimierungsservice hält diese Schritte an einem Ort zusammen, ohne dir eine Entscheidung abzunehmen.</p>
          <div className="mt-6 space-y-3">
            {[
              "Vertrags- und Fristenübersicht statt verstreuter Notizen",
              "Ziele und Wünsche als nachvollziehbare Aufgaben",
              "Vergleichbare Optionen mit Kosten, Laufzeit und Einordnung",
              "Finanzierungsbedarf früh sichtbar machen und – sofern möglich – mit geeigneten Partnern koordinieren",
            ].map((item) => <div key={item} className="flex gap-3 text-[13.5px] text-steel"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-electric-deep" /><span>{item}</span></div>)}
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="rounded-[28px] border border-line bg-paper p-6 sm:p-8">
            <WalletCards className="h-6 w-6 text-electric-deep" />
            <h3 className="mt-4 text-[22px] font-extrabold text-ink">Was der Service nicht verspricht</h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-steel">Keine pauschale Ersparnis, keine garantierte Finanzierung und keine automatische Vertragsänderung. Verfügbarkeit, Konditionen und Eignung hängen vom jeweiligen Anbieter, Partner, Produkt und deiner Situation ab. Umgesetzt wird nur, was du ausdrücklich möchtest.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-x text-center">
        <p className="eyebrow justify-center text-electric-soft">Laufende Betreuung</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-extrabold">Sag uns, was du optimieren oder aufbauen möchtest.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-silver">Wir klären zuerst, ob der Optimierungsservice für deine Themen sinnvoll ist und welche nächsten Schritte realistisch sind.</p>
        <Link href={withAudience("/anfrage?thema=Optimierungsservice", "b2c")} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-extrabold text-ink hover:bg-electric hover:text-white">Anfrage starten <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  </>;
}
