"use client";

import { MapPin, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Advisor } from "@/db/schema";
import { LOCATION_OPTIONS, SERVICES, normalizeTopic, normalizeTopics } from "@/lib/content";
import { AdvisorCard } from "./AdvisorCard";
import { Button } from "@/components/ui/Button";

export function AdvisorFinder({ advisors }: { advisors: Advisor[] }) {
  const params = useSearchParams();
  const topic = normalizeTopic(params.get("thema") ?? "");
  const region = (params.get("region") ?? "").slice(0, 80);

  const update = (next: { thema?: string; region?: string }) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    // Filter sind lokal; kein Server-Routenwechsel bei jedem Tastendruck.
    window.history.replaceState(null, "", `/berater${p.toString() ? `?${p}` : ""}`);
  };

  const filtered = useMemo(() => {
    return advisors
      .map((a) => {
        let score = 0;
        const topicHit = !topic || normalizeTopics(a.topics).includes(topic);
        const regions = [...a.regions, a.city, a.region].map((r) => r.trim().toLocaleLowerCase("de"));
        const normalizedRegion = region.trim().toLocaleLowerCase("de");
        const exactRegion = regions.some((r) => r === normalizedRegion);
        const regionHit =
          !normalizedRegion ||
          exactRegion ||
          regions.some((r) => r.startsWith("deutschlandweit")) ||
          normalizedRegion.startsWith("deutschlandweit");
        if (topic && normalizeTopics(a.topics).includes(topic)) score += 2;
        if (region && exactRegion) score += 3;
        if (a.isFounder) score += 1;
        return { a, ok: topicHit && regionHit, score, exactRegion: !region || exactRegion };
      })
      .filter((x) => x.ok)
      .sort((x, y) => y.score - x.score || x.a.sortOrder - y.a.sortOrder);
  }, [advisors, topic, region]);

  const hasFilter = Boolean(topic || region);

  return (
    <div>
      {/* Filterleiste */}
      <div className="sticky top-[72px] z-30 -mx-5 border-b border-line bg-paper/85 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:pb-0">
            {SERVICES.map((s) => {
              const on = topic === s.name;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => update({ thema: on ? "" : s.name })}
                  aria-pressed={on}
                  className={`chip h-9 shrink-0 px-3.5 text-[13px] transition-all ${
                    on ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700 hover:border-electric/50"
                  }`}
                >
                  {s.shortLabel || s.name}
                </button>
              );
            })}
          </div>
          <div className="relative lg:ml-auto lg:w-64">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
            <input type="search" value={region} onChange={(e) => update({ region: e.target.value })} list="berater-standorte" className="field h-10 appearance-none py-0 pl-10 text-[14px]" aria-label="Region wählen" placeholder="Stadt oder Region suchen" autoComplete="address-level2" maxLength={80} />
            <datalist id="berater-standorte">
              {LOCATION_OPTIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
          {hasFilter && (
            <button type="button" onClick={() => update({ thema: "", region: "" })} className="inline-flex items-center gap-1 text-[13px] font-semibold text-steel hover:text-ink">
              <X className="h-3.5 w-3.5" /> Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Ergebnis */}
      <div className="mt-8">
        <p className="text-[14px] text-steel" aria-live="polite">
          {filtered.length === 1 ? "1 Berater" : `${filtered.length} Berater`}
          {topic ? ` für ${topic}` : ""}
          {region ? ` in ${region}` : ""}
          {region && filtered.some((f) => !f.exactRegion) ? " – teils digital erreichbar" : ""}
        </p>

        {filtered.length > 0 ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ a }) => (
                <div key={a.id} className="reveal-item-css">
                  <AdvisorCard advisor={a} highlightTopic={topic || null} highlightRegion={region || null} />
                </div>
              ))}
            </div>
          ) : (
            <div
              key="empty"
              className="hero-enter mt-5 rounded-[26px] border border-dashed border-ink/15 bg-white p-10 text-center"
            >
              <p className="text-[19px] font-bold text-ink">Für diese Kombination haben wir gerade niemanden vor Ort.</p>
              <p className="mx-auto mt-2 max-w-md text-[15px] text-steel">
                Digital beraten wir deutschlandweit persönlich. Alternativ reicht eine kurze Anfrage – wir finden den passenden nächsten Weg.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={() => update({ region: "" })} variant="dark">Alle Regionen anzeigen</Button>
                <Button href="/anfrage">Anfrage stellen</Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
