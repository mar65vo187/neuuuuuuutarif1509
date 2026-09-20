import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export function PageHero({
  eyebrow,
  title,
  text,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: ReactNode;
  text?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden border-b border-white/8 bg-ink text-white grain ${compact ? "pt-[122px] pb-16" : "pt-[142px] pb-20 sm:pb-24 lg:pb-28"}`}>
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-electric/18 blur-[130px]" />
      <div className="container-x relative">
        <Reveal>
          <p className="eyebrow text-electric-soft">{eyebrow}</p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2.35rem,5.8vw,4.9rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">{title}</h1>
          {text && <p className="mt-6 max-w-3xl text-[clamp(1rem,1.35vw,1.12rem)] leading-[1.75] text-silver">{text}</p>}
        </Reveal>
        {children && <Reveal delay={0.1} className="mt-8">{children}</Reveal>}
      </div>
    </section>
  );
}
