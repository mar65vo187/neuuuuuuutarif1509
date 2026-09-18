"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { LOCATION_OPTIONS, SERVICES } from "@/lib/content";

export function FinderTeaser() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].finder;
  const business = audience === "b2b";
  const [topic, setTopic] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("");

  return (
    <section id="berater-auswahl" style={{ scrollMarginTop: 88 }} className="relative overflow-hidden bg-ink-900 py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-electric/15 blur-[130px]" />
      <div className="container-x relative grid gap-12 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-electric-soft">{copy.eyebrow}</p>
          <h2 className="mt-4 min-h-[2.2em] text-[clamp(2rem,4.4vw,3.6rem)] font-extrabold leading-[1.02]">
            {copy.titleA} <span className="display-i font-normal text-champagne-soft">{copy.titleEm}</span>.
          </h2>
          <p className="mt-5 min-h-[5rem] max-w-md text-[16px] leading-relaxed text-silver">{copy.text}</p>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <form action={business ? "/anfrage" : "/berater"} method="get" className="glass rounded-[28px] p-6 sm:p-8">
            <input type="hidden" name="thema" value={topic || ""} />
            <input type="hidden" name="audience" value={audience} />
            <p className="text-[13px] font-semibold text-platinum">{copy.topicLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SERVICES.map((service) => {
                const on = topic === service.name;
                return (
                  <motion.button
                    key={service.key}
                    type="button"
                    data-topic={service.name}
                    aria-label={service.name}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setTopic(on ? null : service.name)}
                    aria-pressed={on}
                    className={`chip h-9 px-4 text-[13.5px] transition-all duration-300 ${
                      on
                        ? "border-electric bg-electric text-white shadow-[0_8px_24px_-8px_rgba(79,141,255,0.9)]"
                        : "border-white/12 text-silver hover:border-white/30 hover:text-white"
                    } ${service.featured && !on ? "border-champagne/30" : ""}`}
                  >
                    {service.shortLabel || service.name}
                  </motion.button>
                );
              })}
            </div>

            <p className="mt-7 text-[13px] font-semibold text-platinum">{copy.locationLabel}</p>
            <div className="relative mt-3">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-silver" />
              <input
                type="search"
                name="region"
                list="tarifwerk-standorte"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="field-dark appearance-none pl-11"
                placeholder={business ? "Stadt oder Region des Unternehmens (optional)" : "Stadt oder Region suchen (optional)"}
                aria-label={business ? "Unternehmensstandort suchen" : "Stadt oder Region suchen"}
                autoComplete="address-level2"
                maxLength={80}
              />
              <datalist id="tarifwerk-standorte">
                {LOCATION_OPTIONS.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-silver">{copy.note}</p>
              <Button type="submit" size="lg" iconRight={<ArrowRight />}>{copy.button}</Button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
