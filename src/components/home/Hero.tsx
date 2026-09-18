"use client";

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";
import { AudienceToggle, useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { whatsappLink } from "@/lib/content";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].hero;
  const reducedMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const glowX = useTransform(sx, [-0.5, 0.5], ["30%", "70%"]);
  const [activeIdx, setActiveIdx] = useState(1);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % copy.cardSteps.length), 2600);
    return () => clearInterval(t);
  }, [reducedMotion, copy.cardSteps.length]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse), (hover: none)").matches) {
      mx.set(0);
      my.set(0);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white grain" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <motion.div
        aria-hidden
        style={{ left: reducedMotion ? "50%" : glowX }}
        className="pointer-events-none absolute top-[-10%] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-electric/25 blur-[140px]"
      />
      <div aria-hidden className="pointer-events-none absolute bottom-[-30%] right-[-10%] h-[520px] w-[520px] rounded-full bg-champagne/10 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />

      <div className="container-x relative grid min-h-[100svh] items-center gap-14 pb-20 pt-[120px] lg:grid-cols-12 lg:gap-8 lg:pt-[140px]">
        <div className="lg:col-span-7">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease, delay: 0.05 }}>
            <AudienceToggle className="mb-5" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="eyebrow text-electric-soft"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </motion.p>

          <h1 className="mt-6 min-h-[3em] text-[clamp(2.25rem,6.2vw,5.2rem)] font-extrabold leading-[1.0] tracking-[-0.03em]">
            <motion.span
              key={`${audience}-1`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease }}
              className="block text-gradient-silver"
            >
              {copy.lines[0]}
            </motion.span>
            <motion.span
              key={`${audience}-2`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.04 }}
              className="block"
            >
              {copy.lines[1]} <span className="display-i text-champagne-soft">{copy.emphasis}</span>
            </motion.span>
            <motion.span
              key={`${audience}-3`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.08 }}
              className="block"
            >
              {copy.lines[2]}
            </motion.span>
          </h1>

          <motion.p
            key={`${audience}-body`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mt-7 min-h-[5.3rem] max-w-xl text-[17px] leading-relaxed text-silver sm:text-[18px]"
          >
            {copy.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.25 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button href={copy.primaryHref} size="lg" iconRight={<ArrowRight />}>
              {copy.primary}
            </Button>
            <Button href={whatsappLink(copy.whatsapp)} target="_blank" variant="secondary" size="lg" icon={<MessageCircle />}>
              {copy.secondary}
            </Button>
          </motion.div>

          <motion.ul
            key={`${audience}-checks`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 flex min-h-6 flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-silver"
          >
            {copy.checks.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-electric-soft" /> {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <div className="lg:col-span-5" style={{ perspective: 1400 }}>
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, ease, delay: 0.35 }}
            style={{ rotateX: reducedMotion ? 0 : rotX, rotateY: reducedMotion ? 0 : rotY, transformStyle: "preserve-3d" }}
            className="relative mx-auto w-full max-w-[440px]"
          >
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
                {copy.cardSteps.map((item, i) => {
                  const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "queue";
                  return (
                    <motion.li
                      key={item.label}
                      layout
                      transition={{ duration: 0.5, ease }}
                      className={`flex min-h-[66px] items-center justify-between rounded-2xl border px-4 py-3 transition-colors duration-500 ${
                        state === "active"
                          ? "border-electric/50 bg-electric/12"
                          : state === "done"
                            ? "border-white/8 bg-white/4"
                            : "border-white/6 bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors duration-500 ${
                          state === "done" ? "bg-electric text-white" : state === "active" ? "bg-white text-ink" : "border border-white/12 text-silver"
                        }`}>
                          {state === "done" ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[14.5px] font-semibold leading-tight">{item.label}</p>
                          <p className="text-[12.5px] text-silver">{item.sub}</p>
                        </div>
                      </div>
                      <span className={`hidden text-[11.5px] font-medium sm:block ${state === "active" ? "text-electric-soft" : "text-steel"}`}>
                        {state === "done" ? "davor" : state === "active" ? "im Fokus" : "danach"}
                      </span>
                    </motion.li>
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

            <motion.div
              animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="glass absolute -bottom-6 -left-4 hidden rounded-2xl px-4 py-3 text-[13px] sm:block"
              style={{ transform: "translateZ(40px)" }}
            >
              <p className="font-semibold">{copy.floatingTitle}</p>
              <p className="text-silver">{copy.floatingSub}</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
