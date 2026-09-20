"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Reveal, Stagger, Item } from "@/components/ui/Reveal";
import { useAudience } from "@/components/home/AudienceProvider";

const COPY = {
  b2c: {
    eyebrow: "Dein nächster sinnvoller Schritt",
    title: "Erst Klarheit. Dann eine Entscheidung.",
    text: "Du musst nicht vorher wissen, welcher Tarif passt. Sag uns kurz, was dir wichtig ist – wir sortieren die Situation gemeinsam und machen die nächsten Schritte verständlich.",
    cta: "Situation einordnen",
    href: "/anfrage",
    autonomy: "Keine automatische Entscheidung, keine künstliche Verknappung – du entscheidest selbst.",
    items: [["Bedarf verstehen", "Wir hören zu, bevor wir etwas empfehlen."], ["Optionen einordnen", "Leistung, Kosten und Laufzeit werden verständlich erklärt."], ["Du entscheidest", "Die Beratung bleibt unverbindlich und in deiner Hand."]],
  },
  b2b: {
    eyebrow: "Ihr nächster sinnvoller Schritt",
    title: "Erst Struktur. Dann eine Entscheidung.",
    text: "Sie müssen nicht alle Anforderungen vorab perfekt formulieren. Schildern Sie uns kurz die Ausgangslage – wir strukturieren den nächsten sinnvollen Schritt.",
    cta: "Ausgangslage besprechen",
    href: "/anfrage?audience=b2b",
    autonomy: "Keine automatische Entscheidung, keine künstliche Verknappung – Sie entscheiden selbst.",
    items: [["Anforderungen verstehen", "Wir klären zuerst Prioritäten und Rahmenbedingungen."], ["Optionen einordnen", "Leistung, Kosten und Umsetzbarkeit werden nachvollziehbar."], ["Sie entscheiden", "Die Beratung bleibt transparent und ohne Entscheidungsdruck."]],
  },
} as const;

export function PremiumGuidance() {
  const { audience } = useAudience();
  const copy = COPY[audience];
  return (
    <section className="relative overflow-hidden border-b border-line bg-white py-14 sm:py-20">
      <div className="pointer-events-none absolute right-[-12%] top-[-35%] h-[420px] w-[420px] rounded-full bg-electric/10 blur-[110px]" aria-hidden="true" />
      <div className="container-x relative grid gap-9 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-5"><p className="eyebrow text-electric-deep">{copy.eyebrow}</p><h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-[1.04] text-ink">{copy.title}</h2><p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-steel">{copy.text}</p><Link href={copy.href} className="group mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-electric">{copy.cta}<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></Link></Reveal>
        <Stagger className="grid gap-3 sm:grid-cols-3 lg:col-span-7" stagger={0.08}>{copy.items.map(([title, text], index) => <Item key={title}><div className="h-full rounded-2xl border border-line bg-paper p-5"><span className="grid h-9 w-9 place-items-center rounded-full bg-electric/10 text-electric-deep"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span><p className="mt-4 text-[15px] font-bold text-ink">{title}</p><p className="mt-2 text-[13.5px] leading-relaxed text-steel">{text}</p><span className="mt-4 block text-[11px] font-bold tracking-[0.16em] text-electric-deep">0{index + 1}</span></div></Item>)}</Stagger>
      </div>
      <div className="container-x relative mt-7 flex items-center gap-2 text-[12.5px] text-steel"><ShieldCheck className="h-4 w-4 text-electric-deep" aria-hidden="true" /> {copy.autonomy}</div>
    </section>
  );
}
