"use client";

import Link from "next/link";
import { ArrowRight, History, X } from "lucide-react";
import { useEffect, useState } from "react";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { SERVICES } from "@/lib/content";
import { readSessionIntent } from "@/components/site/JourneyContext";

const HIDDEN_KEY = "tarifwerk-personalization-hidden-v1";

type IntentService = {
  slug: string;
  name: string;
  shortLabel?: string;
  short: string;
};

export function SessionIntentCard({ audience }: { audience: AudienceMode }) {
  const [service, setService] = useState<IntentService | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (sessionStorage.getItem(HIDDEN_KEY) === "1") return;
        const intent = readSessionIntent();
        if (!intent.lastServiceSlug) return;
        const match = SERVICES.find((item) => item.slug === intent.lastServiceSlug);
        if (!match) return;
        setService({ slug: match.slug, name: match.name, shortLabel: match.shortLabel, short: match.short });
        setVisible(true);
      } catch {
        // Personalization is optional and must never block the page.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!visible || !service) return null;

  const business = audience === "b2b";
  const requestHref = withAudience("/anfrage?thema=" + encodeURIComponent(service.name), audience);
  const serviceHref = withAudience("/leistungen/" + service.slug, audience);

  return (
    <section className="border-b border-line bg-white" aria-label={business ? "Zuletzt angesehenes Thema" : "Zuletzt angesehen"}>
      <div className="container-x py-5">
        <div className="relative overflow-hidden rounded-[22px] border border-electric/15 bg-[linear-gradient(135deg,rgba(79,141,255,0.07),rgba(255,255,255,0.96))] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.setItem(HIDDEN_KEY, "1"); } catch { /* optional session preference */ }
              setVisible(false);
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-steel hover:text-ink"
            aria-label="Hinweis ausblenden"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex max-w-4xl flex-col gap-4 pr-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric-deep"><History className="h-4.5 w-4.5" /></span>
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-electric-deep">{business ? "Zuletzt angesehen" : "Da warst du zuletzt"}</p>
                <h2 className="mt-1 text-[17px] font-extrabold text-ink">{service.shortLabel || service.name}</h2>
                <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-steel">
                  {business
                    ? "Diese Empfehlung basiert nur auf dem Thema, das Sie in dieser Sitzung selbst angesehen haben."
                    : "Dieser Hinweis basiert nur auf dem Thema, das du in dieser Sitzung selbst angesehen hast."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={serviceHref} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12.5px] font-bold text-ink hover:border-electric/30 hover:text-electric-deep">
                {business ? "Thema erneut öffnen" : "Thema wieder öffnen"}
              </Link>
              <Link href={requestHref} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white hover:bg-electric">
                {business ? "Dazu anfragen" : "Dazu beraten lassen"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
