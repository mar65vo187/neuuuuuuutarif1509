"use client";

import { Flag, Maximize2, RefreshCw, Trophy, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { EMPLOYEE_RACE_RULES, REFERRAL_AVATARS } from "@/lib/gamification-rules";

type RaceRow = {
  employeeId: number;
  name: string;
  imageUrl: string | null;
  qualifiedLeads: number;
  b2bLeads: number;
  b2cCloses: number;
  b2bCloses: number;
  points: number;
  rank: number;
};

type TowerRow = {
  displayName: string;
  avatarKey: string;
  referrals: number;
  successes: number;
  rank: number;
};

type Payload = {
  currentUserId: number;
  race: {
    period: { key: string; label: string };
    rules: typeof EMPLOYEE_RACE_RULES;
    trackLength: number;
    rows: RaceRow[];
  };
  tower: {
    period: { key: string; label: string };
    rows: TowerRow[];
    maxSuccesses: number;
  };
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function avatarSymbol(key: string) {
  return REFERRAL_AVATARS.find((avatar) => avatar.key === key)?.symbol ?? "🚀";
}

function playStepSound() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.16);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}

export function PerformanceGameDashboard({ initial }: { initial: Payload }) {
  const [data, setData] = useState(initial);
  const [sound, setSound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const previousOwnPoints = useRef(initial.race.rows.find((row) => row.employeeId === initial.currentUserId)?.points ?? 0);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/portal/games", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const json = await response.json().catch(() => null) as ({ ok?: boolean } & Payload) | null;
      if (!response.ok || !json?.ok) return;
      const nextOwnPoints = json.race.rows.find((row) => row.employeeId === json.currentUserId)?.points ?? 0;
      if (sound && nextOwnPoints > previousOwnPoints.current) playStepSound();
      previousOwnPoints.current = nextOwnPoints;
      setData({
        currentUserId: json.currentUserId,
        race: json.race,
        tower: json.tower,
      });
    } finally {
      if (manual) setRefreshing(false);
    }
  }, [sound]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(false), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const own = data.race.rows.find((row) => row.employeeId === data.currentUserId);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(79,141,255,.18),transparent_36%),linear-gradient(145deg,rgba(13,28,52,.98),rgba(6,15,29,.98))] p-5 shadow-[0_28px_80px_-38px_rgba(0,0,0,.9)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft"><Flag className="h-4 w-4" /> Performance-Rennstrecke · {data.race.period.label}</p>
            <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold text-white">CRM-Arbeit wird sofort sichtbar.</h2>
            <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-silver">Punkte entstehen ausschließlich aus echten CRM-Ereignissen. Der Monatsstand startet am 1. automatisch neu; historische CRM-Daten bleiben unverändert erhalten.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSound((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-[11.5px] font-bold text-silver hover:bg-white/10 hover:text-white">
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Sound {sound ? "an" : "aus"}
            </button>
            <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-[11.5px] font-bold text-silver hover:bg-white/10 hover:text-white disabled:opacity-50">
              <RefreshCw className={"h-4 w-4 " + (refreshing ? "animate-spin" : "")} /> Aktualisieren
            </button>
            <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className="inline-flex h-10 items-center gap-2 rounded-full bg-electric px-4 text-[11.5px] font-bold text-white hover:bg-electric-deep">
              <Maximize2 className="h-4 w-4" /> TV-Modus
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Qualifizierter Lead", "+" + EMPLOYEE_RACE_RULES.qualifiedLead, "Kontaktweg + Thema vorhanden"],
            ["B2B-Lead Bonus", "+" + EMPLOYEE_RACE_RULES.b2bLeadBonus, "zusätzlich zum Lead"],
            ["B2C-Abschluss", "+" + EMPLOYEE_RACE_RULES.b2cClose, "abgeschlossener Privat-Lead"],
            ["B2B-Abschluss", "+" + EMPLOYEE_RACE_RULES.b2bClose, "2 Abschluss + 2 Business"],
          ].map(([label, points, detail]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-[10.5px] font-extrabold uppercase tracking-wider text-silver">{label}</p><span className="text-[19px] font-extrabold text-electric-soft">{points}</span></div>
              <p className="mt-1 text-[10.5px] text-silver/75">{detail}</p>
            </div>
          ))}
        </div>

        {own && <div className="mt-4 rounded-2xl border border-electric/20 bg-electric/[0.07] px-4 py-3 text-[12px] text-platinum"><strong>Dein Monatsstand:</strong> {own.points} Felder · Position {own.rank} von {data.race.rows.length}</div>}

        <div className="mt-7 space-y-5">
          {data.race.rows.length ? data.race.rows.map((row) => {
            const progress = data.race.trackLength > 0 ? Math.min(96, Math.max(2, (row.points / data.race.trackLength) * 96)) : 2;
            const isOwn = row.employeeId === data.currentUserId;
            return (
              <div key={row.employeeId} className={"rounded-2xl border p-4 " + (isOwn ? "border-electric/30 bg-electric/[0.065]" : "border-white/8 bg-white/[0.025]")}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-[11px] font-extrabold text-white">
                      {row.imageUrl ? <span className="relative h-full w-full"><Image src={row.imageUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /></span> : initials(row.name)}
                    </span>
                    <div><p className="text-[13px] font-extrabold text-white">{row.rank}. {row.name}</p><p className="text-[10.5px] text-silver">{row.qualifiedLeads} Leads · {row.b2bLeads} B2B · {row.b2cCloses + row.b2bCloses} Abschlüsse</p></div>
                  </div>
                  <p className="text-[20px] font-extrabold text-electric-soft">{row.points} <span className="text-[10px] font-bold uppercase tracking-wider text-silver">Felder</span></p>
                </div>
                <div className="relative h-14 overflow-hidden rounded-xl border border-white/8 bg-[#030a15]">
                  <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,.16) 0 1px,transparent 1px 5%)" }} />
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric/15 to-transparent transition-[width] duration-700" style={{ width: progress + "%" }} />
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out" style={{ left: progress + "%" }}>
                    <span className="block text-[27px] drop-shadow-lg" aria-label={row.name + " Rennposition"}>🏎️</span>
                  </div>
                  <div className="absolute bottom-1 right-2 text-[9px] font-bold text-silver/55">Zielskala {data.race.trackLength}</div>
                </div>
              </div>
            );
          }) : <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-[13px] text-silver">Noch keine aktiven Vertriebsmitarbeiter für die Rennstrecke.</div>}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(14,27,48,.96),rgba(7,17,32,.96))] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-champagne/10 text-champagne-soft"><Trophy className="h-5 w-5" /></span>
          <div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-champagne-soft">Empfehlungsturm · {data.tower.period.label}</p><h2 className="mt-1 text-[20px] font-extrabold text-white">Erfolgreiche Empfehlungen im aktuellen Monat</h2><p className="mt-1 text-[12px] text-silver">Nur freiwillige Wunschprofile. Ein Erfolg zählt erst bei aktiviertem Abschluss.</p></div>
        </div>
        <div className="mt-6 flex min-h-[280px] items-end gap-3 overflow-x-auto pb-2">
          {data.tower.rows.length ? data.tower.rows.map((row) => {
            const height = row.successes === 0 ? 8 : Math.max(18, Math.round((row.successes / data.tower.maxSuccesses) * 100));
            return (
              <div key={row.rank + "-" + row.displayName} className="flex min-w-[92px] flex-1 flex-col items-center">
                <div className="mb-2 text-center"><span className="text-[24px]" aria-hidden>{avatarSymbol(row.avatarKey)}</span><p className="mt-1 max-w-[110px] truncate text-[10.5px] font-bold text-white">{row.displayName}</p></div>
                <div className="flex h-[190px] w-full items-end">
                  <div className="w-full rounded-t-xl border border-electric/20 bg-gradient-to-t from-electric/65 to-electric-soft/80 transition-[height] duration-700" style={{ height: height + "%" }}>
                    <p className="pt-2 text-center text-[18px] font-extrabold text-white">{row.successes}</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[9.5px] text-silver">{row.referrals} Empfehlung{row.referrals === 1 ? "" : "en"}</p>
              </div>
            );
          }) : <div className="w-full rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-[13px] text-silver">Noch keine freiwilligen Teilnehmer im aktuellen Monat.</div>}
        </div>
      </section>
    </div>
  );
}
