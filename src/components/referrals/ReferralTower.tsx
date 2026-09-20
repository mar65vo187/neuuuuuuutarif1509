"use client";

import { RefreshCw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { REFERRAL_AVATARS } from "@/lib/gamification-rules";

type Tower = {
  period: { key: string; label: string };
  rows: Array<{
    displayName: string;
    avatarKey: string;
    referrals: number;
    successes: number;
    rank: number;
  }>;
  maxSuccesses: number;
};

function symbol(key: string) {
  return REFERRAL_AVATARS.find((avatar) => avatar.key === key)?.symbol ?? "🚀";
}

export function ReferralTower({ initial }: { initial: Tower }) {
  const [tower, setTower] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function load(manual = false) {
    if (manual) setBusy(true);
    try {
      const response = await fetch("/api/referrals/tower", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const json = await response.json().catch(() => null) as { ok?: boolean; tower?: Tower } | null;
      if (response.ok && json?.ok && json.tower) setTower(json.tower);
    } finally {
      if (manual) setBusy(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => void load(false), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="bg-ink py-16 text-white sm:py-20" aria-labelledby="referral-tower-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-electric-soft"><Trophy className="h-4 w-4" /> Empfehlungsturm · {tower.period.label}</p>
            <h2 id="referral-tower-title" className="mt-3 text-[clamp(1.9rem,4vw,3.2rem)] font-extrabold">Erfolgreiche Empfehlungen wachsen sichtbar.</h2>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-silver">Freiwillige Monatsübersicht. Sichtbar sind nur Wunschname, Avatar und Fortschritt. Ein Erfolg zählt erst, wenn aus einer Empfehlung ein aktivierter Abschluss entstanden ist.</p>
          </div>
          <button type="button" onClick={() => void load(true)} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 text-[11.5px] font-bold text-silver hover:bg-white/10 hover:text-white disabled:opacity-50"><RefreshCw className={"h-4 w-4 " + (busy ? "animate-spin" : "")} /> Aktualisieren</button>
        </div>

        {tower.rows.length ? (
          <div className="mt-10 overflow-x-auto">
            <div className="flex min-h-[330px] min-w-max items-end gap-4 border-b border-white/10 px-2 pb-4">
              {tower.rows.map((row) => {
                const height = row.successes === 0 ? 8 : Math.max(18, Math.round((row.successes / tower.maxSuccesses) * 100));
                return (
                  <div key={row.rank + "-" + row.displayName} className="flex w-[108px] flex-col items-center">
                    <div className="mb-2 text-center">
                      <span className="text-[30px]" aria-hidden>{symbol(row.avatarKey)}</span>
                      <p className="mt-1 max-w-[108px] truncate text-[11px] font-extrabold">{row.displayName}</p>
                      <p className="text-[9.5px] text-silver">#{row.rank}</p>
                    </div>
                    <div className="flex h-[220px] w-full items-end">
                      <div className="w-full rounded-t-2xl border border-electric/25 bg-gradient-to-t from-electric/65 to-electric-soft/90 shadow-[0_-18px_45px_-24px_rgba(79,141,255,.8)] transition-[height] duration-700" style={{ height: height + "%" }}>
                        <p className="pt-3 text-center text-[22px] font-extrabold">{row.successes}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[9.5px] leading-tight text-silver">{row.referrals} Empfehlung{row.referrals === 1 ? "" : "en"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-[14px] font-bold">Der Monatsturm wartet auf seine ersten freiwilligen Teilnehmer.</p>
            <p className="mt-2 text-[12.5px] text-silver">Wer bei der Registrierung zustimmt, erscheint nach der ersten Empfehlung mit Wunschname und Avatar.</p>
          </div>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-silver/80">Der Monat startet automatisch am 1. neu. Kundendaten, E-Mail-Adressen, Telefonnummern und Vertragsdetails werden im Turm nicht veröffentlicht.</p>
      </div>
    </section>
  );
}
