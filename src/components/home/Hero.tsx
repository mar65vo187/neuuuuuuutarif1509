"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY } from "@/lib/audience-copy";

export function Hero() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].hero;
  const [activeIdx, setActiveIdx] = useState(0);
  const safeActiveIdx = copy.cardSteps.length ? activeIdx % copy.cardSteps.length : 0;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || copy.cardSteps.length < 2) return;
    const timer = window.setInterval(() => setActiveIdx((index) => (index + 1) % copy.cardSteps.length), 2800);
    return () => window.clearInterval(timer);
  }, [audience, copy.cardSteps.length]);

  const trustAnchor = audience === "b2b"
    ? "Ein Ansprechpartner statt Vertragskomplexität. Sie entscheiden selbst, ob und wie Sie weitergehen."
    : "Ein Ansprechpartner statt Tarif-Dschungel. Du entscheidest selbst, ob und wie es weitergeht.";

  const reassurance = audience === "b2b"
    ? "Kostenlose Erstorientierung · transparent erklärt · Entscheidung bleibt bei Ihnen"
    : "Kostenlose Erstorientierung · transparent erklärt · die Entscheidung bleibt bei dir";

  const withAudience = (href: string) => {
    const [pathAndQuery, hash = ""] = href.split("#", 2);
    const [path, query = ""] = pathAndQuery.split("?", 2);
    const params = new URLSearchParams(query);
    params.set("audience", audience);
    return path + "?" + params.toString() + (hash ? "#" + hash : "");
  };

  return (
    <section aria-labelledby="home-hero-title" className="relative isolate overflow-hidden bg-ink text-white grain">
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute left-[18%] top-[-20%] h-[580px] w-[580px] rounded-full bg-electric/18 blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-35%] right-[-8%] h-[500px] w-[500px] rounded-full bg-champagne/8 blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-ink" />

      <div className="container-x relative grid min-h-[78svh] items-center gap-10 pb-12 pt-[106px] lg:min-h-[82svh] lg:grid-cols-12 lg:gap-10 lg:pb-14 lg:pt-[120px]">
        <div className="lg:col-span-7">
          <p className="eyebrow hero-enter max-w-xl text-electric-soft [--hero-delay:110ms]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{copy.eyebrow}</p>
          <h1 id="home-hero-title" key={audience} className="mt-5 max-w-[940px] text-[clamp(2.7rem,6.3vw,5.65rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">
            <span className="hero-enter block text-gradient-silver [--hero-delay:150ms]">{copy.lines[0]}</span>
            <span className="hero-enter mt-1 block display-i font-normal text-champagne-soft [--hero-delay:190ms]">{copy.emphasis}</span>
            <span className="hero-enter mt-1 block [--hero-delay:230ms]">{copy.lines[2]}</span>
          </h1>
          <p key={`${audience}-body`} className="hero-enter mt-6 max-w-2xl text-[16.5px] leading-relaxed text-silver sm:text-[18px] [--hero-delay:280ms]">{copy.body}</p>
          <div className="hero-enter mt-7 flex flex-col gap-4 sm:flex-row sm:items-center [--hero-delay:330ms]">
            <Button href={withAudience(copy.primaryHref)} size="lg" iconRight={<ArrowRight />} className="w-full sm:w-auto">{copy.primary}</Button>
            <Link href={withAudience(copy.secondaryHref)} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-[14.5px] font-semibold text-platinum transition-colors hover:text-white sm:justify-start">
              {copy.secondary}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <p className="hero-enter mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-silver/90 [--hero-delay:360ms]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-electric-soft" aria-hidden="true" />
            <span>{reassurance}</span>
          </p>
          <ul key={`${audience}-checks`} aria-label="Vorteile der Erstberatung" className="hero-enter mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-silver [--hero-delay:390ms]">
            {copy.checks.map((item) => <li key={item} className="inline-flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/7"><Check className="h-3.5 w-3.5 text-electric-soft" aria-hidden="true" /></span>{item}</li>)}
          </ul>
          <div className="hero-enter mt-5 inline-flex max-w-xl items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-[12.5px] leading-relaxed text-silver [--hero-delay:430ms]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-electric-soft" aria-hidden="true" /><span>{trustAnchor}</span></div>
        </div>

        <div className="hero-enter lg:col-span-5 [--hero-delay:220ms]"><div className="mx-auto w-full max-w-[430px]"><div className="glass relative overflow-hidden rounded-[26px] p-5 shadow-soft sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-electric/22 blur-[70px]" />
          <div className="relative flex items-start justify-between gap-4"><div><p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-silver">{copy.cardEyebrow}</p><p className="mt-1.5 text-[19px] font-bold">{copy.cardTitle}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-silver"><span className="relative flex h-2 w-2" aria-hidden="true"><span className="absolute inline-flex h-full w-full rounded-full bg-electric-soft animate-pulse-dot" /><span className="relative inline-flex h-2 w-2 rounded-full bg-electric" /></span>{copy.cardBadge}</span></div>
          <ol className="relative mt-5 space-y-2" aria-label={copy.cardTitle}>{copy.cardSteps.map((item, index) => { const active = index === safeActiveIdx; return <li key={item.label} aria-current={active ? "step" : undefined} className={`rounded-2xl border px-4 py-3.5 transition-[background-color,border-color] duration-300 ${active ? "border-electric/45 bg-electric/10" : "border-white/8 bg-white/[0.025]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${active ? "bg-electric text-white" : "border border-white/12 text-silver"}`}>{String(index + 1).padStart(2, "0")}</span><div><p className="text-[14px] font-semibold">{item.label}</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-silver">{item.sub}</p></div></div></li>; })}</ol>
          <div className="relative mt-5 flex items-center gap-3 border-t border-white/8 pt-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[12px] font-extrabold text-ink">ME</span><div><p className="text-[13.5px] font-semibold">{copy.person}</p><p className="text-[12px] text-silver">{copy.personSub}</p></div></div>
        </div></div></div>
      </div>
    </section>
  );
}
