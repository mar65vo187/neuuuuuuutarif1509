import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BadgeEuro, Banknote, Check, FileSearch, Goal, Layers3, RefreshCcw,
  ShieldCheck, Sparkles, SunMedium, UploadCloud, WandSparkles,
} from "lucide-react";
import { OptimizationCheckoutForm } from "@/components/site/OptimizationCheckoutForm";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Optimierung+ für 1,99 € im Monat",
  description: "Verträge, Ziele und Projekte an einem Ort: TarifWerk prüft deine Anliegen, koordiniert passende Lösungen und stellt bei passenden Optimierungen bis zu drei Angebote gegenüber.",
  alternates: { canonical: "/optimieren" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "TarifWerk Optimierung+",
    description: "Dein persönlicher Optimierungsbereich für Verträge, Ziele und Projekte.",
    url: SITE.url + "/optimieren",
    type: "website",
  },
};

const STEPS = [
  { icon: Goal, title: "Wunsch eintragen", text: "Du beschreibst dein Ziel, deinen Vertrag oder dein Projekt – von Mobilfunk bis Solar." },
  { icon: UploadCloud, title: "Unterlagen hochladen", text: "Verträge und relevante Unterlagen landen geschützt in deinem persönlichen Vorgang." },
  { icon: FileSearch, title: "Wir prüfen", text: "TarifWerk strukturiert den Bedarf, prüft verfügbare Partner und fordert passende Optionen an." },
  { icon: Layers3, title: "Bis zu 3 Optionen", text: "Wenn sinnvoll und verfügbar, erhältst du einen übersichtlichen Vergleich mit bis zu drei Angeboten." },
  { icon: WandSparkles, title: "Du entscheidest", text: "Du nimmst an oder lehnst ab. Ohne deine Entscheidung wird kein Angebot für dich umgesetzt." },
  { icon: RefreshCcw, title: "Wir koordinieren weiter", text: "Nach deiner Wahl begleiten wir die nächsten Schritte und halten den Vorgang im System nach." },
];

const USE_CASES = [
  "Internet, Mobilfunk & TV", "Strom & Gas", "Versicherungen", "Solar & Wärmepumpe",
  "Immobilien", "Edelmetalle", "Klima", "Sicherheit",
];

export default function OptimizationLandingPage() {
  return (
    <div className="bg-ink text-white">
      <section className="relative overflow-hidden border-b border-white/8 pb-20 pt-32 sm:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(79,141,255,0.28),transparent_35%),radial-gradient(circle_at_20%_85%,rgba(217,184,119,0.12),transparent_36%)]" />
        <div className="container-x relative grid items-center gap-12 xl:grid-cols-[1.1fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-electric/25 bg-electric/10 px-4 py-2 text-xs font-bold text-electric-soft">
              <Sparkles className="h-4 w-4" /> TarifWerk Optimierung+
            </div>
            <h1 className="mt-7 max-w-4xl text-balance text-[clamp(3rem,6vw,6.5rem)] font-extrabold leading-[0.94] tracking-[-0.055em]">
              Deine Verträge. Deine Ziele. <span className="text-electric-soft">Ein System.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-silver sm:text-xl">
              Für <strong className="text-white">1,99 € im Monat</strong> bündelst du deine Optimierungswünsche an einem Ort.
              Du lädst Verträge hoch, legst Ziele oder Projekte an und bekommst einen klaren Bearbeitungsstand statt losem Nachrichtenchaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Persönlicher Bereich", "Vertrags-Uploads", "3er-Vergleich", "Projektkoordination"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
                  <Check className="h-4 w-4 text-emerald-300" /> {item}
                </span>
              ))}
            </div>
            <p className="mt-7 max-w-2xl text-sm leading-6 text-slate-400">
              Optimierung+ ist eine laufende Organisations-, Prüf- und Vermittlungskoordination. Ein konkretes Angebot, eine Ersparnis, Finanzierung oder Verfügbarkeit kann nicht garantiert werden.
            </p>
          </div>
          <OptimizationCheckoutForm />
        </div>
      </section>

      <section className="container-x py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-electric-soft">So funktioniert es</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Von „Ich will das ändern“ bis zur umsetzbaren Lösung.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-[26px] border border-white/9 bg-white/[0.045] p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-electric/12 text-electric-soft"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-extrabold text-slate-500">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-silver">{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[0.025]">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-champagne-soft">Mehr als Tarifwechsel</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Auch größere Wünsche werden zu einem Vorgang.</h2>
            <p className="mt-5 text-base leading-7 text-silver">
              Beispiel Solar: Du hinterlegst dein Ziel, Eckdaten und Unterlagen. TarifWerk koordiniert die Prüfung mit verfügbaren Partnern, dokumentiert offene Punkte und kann – wenn gewünscht und verfügbar – auch den Kontakt zu Finanzierungspartnern koordinieren.
            </p>
            <div className="mt-7 rounded-2xl border border-champagne/20 bg-champagne/8 p-5 text-sm leading-6 text-slate-200">
              <Banknote className="mb-3 h-5 w-5 text-champagne-soft" />
              Finanzierungen werden nicht von TarifWerk zugesagt. Kreditentscheidung, Konditionen und Bonitätsprüfung liegen beim jeweiligen Finanzierungspartner.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {USE_CASES.map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/9 bg-ink-800 p-4">
                {index === 3 ? <SunMedium className="h-5 w-5 text-champagne-soft" /> : index < 2 ? <BadgeEuro className="h-5 w-5 text-electric-soft" /> : <ShieldCheck className="h-5 w-5 text-electric-soft" />}
                <p className="mt-3 text-sm font-bold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-20">
        <div className="rounded-[34px] border border-electric/20 bg-[radial-gradient(circle_at_80%_20%,rgba(79,141,255,.22),transparent_34%),rgba(255,255,255,.04)] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-electric-soft">Für 1,99 € / Monat</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Mach aus offenen To-dos ein persönliches Optimierungssystem.</h2>
            <p className="mt-4 text-silver">Starte oben direkt oder sprich zuerst mit TarifWerk, wenn du Fragen zum Ablauf hast.</p>
          </div>
          <Link href="/anfrage" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-slate-100 lg:mt-0">
            Erst beraten lassen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
