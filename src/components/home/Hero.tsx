"use client";

import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AudienceToggle, useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { whatsappLink } from "@/lib/content";

export function Hero() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].hero;
  const [activeIdx, setActiveIdx] = useState(1);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => setActiveIdx((index) => (index + 1) % copy.cardSteps.length), 2600);
    return () => window.clearInterval(timer);
  }, [copy.cardSteps.length]);

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white grain">
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-10%] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-electric/25 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-30%] right-[-10%] h-[520px] w-[520px] rounded-full bg-champagne/10 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />

      <div className="container-x relative grid min-h-[94svh] items-center gap-12 pb-16 pt-[112px] lg:grid-cols-12 lg:gap-8 lg:pb-16 lg:pt-[126px]">
        <div className="lg:col-span-7">
          <div className="hero-enter [--hero-delay:70ms]">
            <AudienceToggle className="mb-5" />
          </div>

          <p className="eyebrow hero-enter text-electric-soft [--hero-delay:120ms]">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </p>

          <h1 key={audience} className="mt-6 min-h-[3em] text-[clamp(2.25rem,6.2vw,5.2rem)] font-extrabold leading-[1.0] tracking-[-0.03em]">
            <span className="hero-enter block text-gradient-silver [--hero-delay:150ms]">{copy.lines[0]}</span>
            <span className="hero-enter block [--hero-delay:200ms]">
              {copy.lines[1]} <span className="display-i text-champagne-soft">{copy.emphasis}</span>
            </span>
            <span className="hero-enter block [--hero-delay:250ms]">{copy.lines[2]}</span>
          </h1>

          <p
            key={`${audience}-body`}
            className="hero-enter mt-7 min-h-[5.3rem] max-w-xl text-[17px] leading-relaxed text-silver sm:text-[18px] [--hero-delay:300ms]"
          >
            {copy.body}
          </p>

          <div className="hero-enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center [--hero-delay:350ms]">
            <Button href={copy.primaryHref} size="lg" iconRight={<ArrowRight />}>{copy.primary}</Button>
            <Button href={whatsappLink(copy.whatsapp)} target="_blank" variant="secondary" size="lg" icon={<MessageCircle />}>
              {copy.secondary}
            </Button>
          </div>

          <ul
            key={`${audience}-checks`}
            className="hero-enter mt-7 flex min-h-6 flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-silver [--hero-delay:400ms]"
          >
            {copy.checks.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-electric-soft" /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-enter lg:col-span-5 [--hero-delay:260ms]">
          <div className="relative mx-auto w-full max-w-[440px] transition-transform duration-300 ease-premium lg:hover:-translate-y-1">
            <div className="glass relative min-h-[505px] overflow-hidden rounded-[28px] p-6 shadow-soft">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-electric/30 blur-[70px]" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-silver">{copy.cardEyebrow}</p>
                  <p className="mt-1 text-[18px] font-bold">{copy.cardTitle}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-silver">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-electric-soft animate-pulse-dot" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-electric" />
                  </span>
                  {copy.cardBadge}
                </span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {copy.cardSteps.map((item, index) => {
                  const state = index < activeIdx ? "done" : index === activeIdx ? "active" : "queue";
                  return (
                    <li
                      key={item.label}
                      className={`flex min-h-[66px] items-center justify-between rounded-2xl border px-4 py-3 transition-[background-color,border-color] duration-300 ${
                        state === "active"
                          ? "border-electric/50 bg-electric/12"
                          : state === "done"
                            ? "border-white/8 bg-white/4"
                            : "border-white/6 bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors duration-300 ${
                          state === "done" ? "bg-electric text-white" : state === "active" ? "bg-white text-ink" : "border border-white/12 text-silver"
                        }`}>
                          {state === "done" ? <Check className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[14.5px] font-semibold leading-tight">{item.label}</p>
                          <p className="text-[12.5px] text-silver">{item.sub}</p>
                        </div>
                      </div>
                      <span className={`hidden text-[11.5px] font-medium sm:block ${state === "active" ? "text-electric-soft" : "text-steel"}`}>
                        {state === "done" ? "davor" : state === "active" ? "im Fokus" : "danach"}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-ink/40 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-platinum to-electric text-[13px] font-extrabold text-ink">ME</span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{copy.person}</p>
                  <p className="text-[12.5px] text-silver">{copy.personSub}</p>
                </div>
              </div>
            </div>

            <div className="glass float-soft absolute -bottom-6 -left-4 hidden rounded-2xl px-4 py-3 text-[13px] sm:block">
              <p className="font-semibold">{copy.floatingTitle}</p>
              <p className="text-silver">{copy.floatingSub}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
