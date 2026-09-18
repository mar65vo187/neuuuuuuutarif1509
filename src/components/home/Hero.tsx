"use client";

import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AudienceToggle, useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { whatsappLink } from "@/lib/content";

export function Hero() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].hero;
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || copy.cardSteps.length < 2) return;
    const timer = window.setInterval(() => setActiveIdx((index) => (index + 1) % copy.cardSteps.length), 2800);
    return () => window.clearInterval(timer);
  }, [copy.cardSteps.length]);

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white grain">
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute left-[18%] top-[-20%] h-[580px] w-[580px] rounded-full bg-electric/18 blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-35%] right-[-8%] h-[500px] w-[500px] rounded-full bg-champagne/8 blur-[150px]" />

      <div className="container-x relative grid min-h-[88svh] items-center gap-10 pb-14 pt-[106px] lg:grid-cols-12 lg:gap-10 lg:pb-16 lg:pt-[120px]">
        <div className="lg:col-span-7">
          <div className="hero-enter [--hero-delay:60ms]">
            <AudienceToggle className="mb-5" />
          </div>

          <p className="eyebrow hero-enter max-w-xl text-electric-soft [--hero-delay:110ms]">{copy.eyebrow}</p>

          <h1 key={audience} className="mt-5 max-w-[900px] text-[clamp(2.55rem,6vw,5.3rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
            <span className="hero-enter block text-gradient-silver [--hero-delay:150ms]">{copy.lines[0]}</span>
            <span className="hero-enter mt-1 block display-i font-normal text-champagne-soft [--hero-delay:190ms]">{copy.emphasis}</span>
            <span className="hero-enter mt-1 block [--hero-delay:230ms]">{copy.lines[2]}</span>
          </h1>

          <p key={`${audience}-body`} className="hero-enter mt-6 max-w-2xl text-[16.5px] leading-relaxed text-silver sm:text-[18px] [--hero-delay:280ms]">
            {copy.body}
          </p>

          <div className="hero-enter mt-7 flex flex-col gap-3 sm:flex-row sm:items-center [--hero-delay:330ms]">
            <Button href={copy.primaryHref} size="lg" iconRight={<ArrowRight />}>{copy.primary}</Button>
            <Button href={whatsappLink(copy.whatsapp)} target="_blank" variant="secondary" size="lg" icon={<MessageCircle />}>
              {copy.secondary}
            </Button>
          </div>

          <ul key={`${audience}-checks`} className="hero-enter mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-silver [--hero-delay:380ms]">
            {copy.checks.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/7"><Check className="h-3.5 w-3.5 text-electric-soft" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-enter lg:col-span-5 [--hero-delay:220ms]">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="glass relative overflow-hidden rounded-[26px] p-5 shadow-soft sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-electric/22 blur-[70px]" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-silver">{copy.cardEyebrow}</p>
                  <p className="mt-1.5 text-[19px] font-bold">{copy.cardTitle}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-silver">{copy.cardBadge}</span>
              </div>

              <ol className="relative mt-5 space-y-2">
                {copy.cardSteps.map((item, index) => {
                  const active = index === activeIdx;
                  return (
                    <li key={item.label} className={`rounded-2xl border px-4 py-3.5 transition-[background-color,border-color] duration-300 ${active ? "border-electric/45 bg-electric/10" : "border-white/8 bg-white/[0.025]"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${active ? "bg-electric text-white" : "border border-white/12 text-silver"}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[14px] font-semibold">{item.label}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-silver">{item.sub}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="relative mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[12px] font-extrabold text-ink">ME</span>
                <div>
                  <p className="text-[13.5px] font-semibold">{copy.person}</p>
                  <p className="text-[12px] text-silver">{copy.personSub}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
