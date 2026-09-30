import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FolderHeart,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Reveal, Stagger, Item } from "@/components/ui/Reveal";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { OPTIMIZATION_PUBLIC_TERMS } from "@/lib/optimization-shared";

const BENEFITS = [
  {
    icon: FolderHeart,
    title: "Alles an einem Ort",
    text: "Verträge, Wünsche und nächste Schritte bleiben strukturiert statt über Chats, Notizen und Fristen verteilt.",
  },
  {
    icon: ClipboardCheck,
    title: "Optionen nachvollziehbar",
    text: "Wenn passende Lösungen verfügbar sind, können bis zu drei Optionen mit Kosten, Laufzeit und Einordnung gegenübergestellt werden.",
  },
  {
    icon: RefreshCw,
    title: "Nicht nur einmal prüfen",
    text: "Neue Ziele und anstehende Vertragsfristen können später wieder aufgenommen werden, ohne jedes Thema komplett neu zu starten.",
  },
] as const;

export function OptimizationMembershipTeaser({ audience }: { audience: AudienceMode }) {
  if (audience !== "b2c") return null;

  return (
    <section className="relative overflow-hidden border-y border-line bg-white py-16 sm:py-20" aria-labelledby="optimization-membership-title">
      <div aria-hidden className="pointer-events-none absolute right-[-12%] top-[-35%] h-[520px] w-[520px] rounded-full bg-electric/[0.08] blur-[130px]" />
      <div className="container-x relative">
        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <Reveal className="relative overflow-hidden rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-electric/25 blur-[90px]" />
            <div className="relative">
              <p className="eyebrow text-electric-soft"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> TarifWerk Optimierungsservice</p>
              <h2 id="optimization-membership-title" className="mt-4 max-w-xl text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.02]">
                Deine Themen im Blick.
                <br />
                <span className="display-i font-normal text-champagne-soft">Nicht nur einmal.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-silver">
                Für 1,99 € pro Monat kannst du relevante TarifWerk-Themen in einer laufenden Betreuung bündeln – vom Vertragsbestand bis zu neuen Zielen und Projekten.
              </p>

              <div className="mt-7 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-[44px] font-extrabold tracking-[-0.04em]">1,99 €</span>
                <span className="pb-2 text-[12px] font-semibold text-silver">pro Monat</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-silver/80">
                {OPTIMIZATION_PUBLIC_TERMS.taxNote} {OPTIMIZATION_PUBLIC_TERMS.minimumTerm}, {OPTIMIZATION_PUBLIC_TERMS.cancellation}.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={withAudience("/optimierungsservice", audience)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-electric px-5 text-[13.5px] font-extrabold text-white transition hover:bg-electric-deep">
                  Service ansehen <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={withAudience("/anfrage?thema=Optimierungsservice", audience)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 text-[13.5px] font-bold text-white transition hover:bg-white/[0.09]">
                  Service erklären lassen
                </Link>
              </div>
              <p className="mt-4 text-[10.5px] leading-relaxed text-silver/75">
                Eine Anfrage allein aktiviert keine Mitgliedschaft und löst keine Abbuchung aus.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col justify-center">
            <Reveal>
              <p className="eyebrow text-electric-deep">Vom Einzelthema zur laufenden Übersicht</p>
              <h3 className="mt-3 max-w-3xl text-[clamp(1.65rem,3.2vw,2.6rem)] font-extrabold leading-[1.05] text-ink">
                Für Menschen, die nicht jedes Jahr wieder bei null anfangen wollen.
              </h3>
              <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-steel">
                Der Service ersetzt keine eigene Entscheidung. Er schafft Struktur, hält offene Punkte sichtbar und hilft dabei, sinnvolle nächste Schritte geordnet zu prüfen.
              </p>
            </Reveal>

            <Stagger className="mt-7 grid gap-3 sm:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <Item key={title}>
                  <article className="h-full rounded-[22px] border border-line bg-paper/70 p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric-deep"><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span>
                    <h4 className="mt-4 text-[15px] font-extrabold text-ink">{title}</h4>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{text}</p>
                  </article>
                </Item>
              ))}
            </Stagger>

            <Reveal className="mt-5 flex items-start gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-[12px] leading-relaxed text-steel">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-electric-deep" aria-hidden="true" />
              <span>Keine pauschale Ersparnis, keine garantierte Finanzierung und keine automatische Vertragsänderung – umgesetzt wird nur, was du ausdrücklich möchtest.</span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
