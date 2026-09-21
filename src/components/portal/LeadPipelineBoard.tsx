"use client";

import Link from "next/link";
import { AlarmClock, ArrowRight, BriefcaseBusiness, CalendarCheck, CheckCircle2, Flame, Loader2, Mail, Phone, PhoneCall, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { formatDate } from "@/components/portal/ui";

type Row = {
  id: number;
  name: string;
  topic: string | null;
  status: string;
  priority: string;
  contactOutcome: string;
  nextActionAt: string | null;
  nextActionOverdue: boolean;
  confirmedSlot: string | null;
  phone: string | null;
  email: string | null;
  companyName: string | null;
  audience: "b2c" | "b2b";
  createdByName: string | null;
  existingProductNames: string[];
  interestProductNames: string[];
  soldProductNames: string[];
  intelligence: {
    label: string;
    detail: string;
    tone: "critical" | "high" | "normal" | "done";
    completeness: number;
    missing: string[];
  };
};

const COLUMNS = [
  { key: "neu", label: "Neu", icon: Sparkles },
  { key: "kontaktiert", label: "Angerufen", icon: PhoneCall },
  { key: "termin_bestaetigt", label: "Terminiert", icon: CalendarCheck },
  { key: "in_beratung", label: "In Beratung", icon: Flame },
  { key: "abgeschlossen", label: "Abgeschlossen", icon: CheckCircle2 },
  { key: "verloren", label: "Nicht zustande", icon: ArrowRight },
] as const;

const PRIORITY: Record<string, string> = {
  hot: "border-red-200 bg-red-50 text-red-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  normal: "border-electric/15 bg-electric/[0.06] text-electric-deep",
  low: "border-line bg-paper text-steel",
};

const INTELLIGENCE: Record<Row["intelligence"]["tone"], string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  normal: "border-electric/15 bg-electric/[0.06] text-ink-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function LeadPipelineBoard({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const grouped = useMemo(() => new Map(COLUMNS.map((column) => [column.key, rows.filter((row) => row.status === column.key)])), [rows]);

  async function patch(row: Row, body: Record<string, unknown>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/portal/leads/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Änderung fehlgeschlagen.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Änderung fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
      <div className="no-scrollbar grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3 xl:grid-flow-row xl:grid-cols-3 2xl:grid-cols-6">
        {COLUMNS.map(({ key, label, icon: Icon }) => {
          const items = grouped.get(key) ?? [];
          return (
            <section key={key} className="min-h-[320px] rounded-[22px] border border-white/70 bg-white/55 p-3 shadow-[0_22px_55px_-40px_rgba(6,11,22,0.6)] backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-electric-deep" /><h2 className="text-[13px] font-extrabold">{label}</h2></div>
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-white">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((row) => (
                  <article key={row.id} className="rounded-2xl border border-line bg-white p-3.5 shadow-[0_14px_32px_-26px_rgba(6,11,22,0.55)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Link href={`/portal/leads/${row.id}`} className="min-w-0 truncate text-[14px] font-extrabold hover:text-electric-deep">{row.name}</Link>
                          {row.audience === "b2b" && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-champagne/25 bg-champagne/10 px-2 py-0.5 text-[9.5px] font-extrabold text-champagne-soft"><BriefcaseBusiness className="h-2.5 w-2.5" /> Business</span>}
                        </div>
                        {row.companyName && <p className="mt-0.5 truncate text-[11.5px] font-bold text-platinum">{row.companyName}</p>}
                        <p className="mt-0.5 truncate text-[11.5px] text-steel">{row.topic ?? "Ohne Thema"} · #{row.id}</p>
                      </div>
                      <span className={`chip shrink-0 px-2 py-0.5 text-[10px] ${PRIORITY[row.priority] ?? PRIORITY.normal}`}>{row.priority === "hot" ? "HOT" : row.priority === "high" ? "HOCH" : row.priority === "low" ? "NIEDRIG" : "NORMAL"}</span>
                    </div>

                    {(row.phone || row.email) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.phone && <a href={`tel:${row.phone}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-paper/70 px-2 py-1 text-[10px] font-semibold text-platinum hover:border-electric/30"><Phone className="h-3 w-3 text-electric-soft" /> <span className="truncate">{row.phone}</span></a>}
                        {row.email && <a href={`mailto:${row.email}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-paper/70 px-2 py-1 text-[10px] font-semibold text-platinum hover:border-electric/30"><Mail className="h-3 w-3 shrink-0 text-electric-soft" /> <span className="max-w-[190px] truncate">{row.email}</span></a>}
                      </div>
                    )}

                    <div className={`mt-3 rounded-xl border px-3 py-2 ${INTELLIGENCE[row.intelligence.tone]}`}>
                      <p className="text-[11.5px] font-extrabold">{row.intelligence.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed opacity-80">{row.intelligence.detail}</p>
                    </div>

                    {row.nextActionAt && (
                      <p className={`mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold ${row.nextActionOverdue ? "text-red-700" : "text-steel"}`}>
                        <AlarmClock className="h-3 w-3" /> {row.nextActionOverdue ? "Überfällig: " : "Nächste Aktion: "}{formatDate(row.nextActionAt)}
                      </p>
                    )}

                    {(row.existingProductNames.length + row.interestProductNames.length + row.soldProductNames.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.existingProductNames.slice(0, 2).map((name) => <span key={"e"+name} className="chip border-sky-200 bg-sky-50 px-2 py-0.5 text-[9.5px] text-sky-800">Hat: {name}</span>)}
                        {row.interestProductNames.slice(0, 2).map((name) => <span key={"i"+name} className="chip border-amber-200 bg-amber-50 px-2 py-0.5 text-[9.5px] text-amber-800">Interesse: {name}</span>)}
                        {row.soldProductNames.slice(0, 2).map((name) => <span key={"s"+name} className="chip border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] text-emerald-800">Abschluss: {name}</span>)}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {row.status === "neu" && (
                        <button disabled={busy !== null} onClick={() => patch(row, { status: "kontaktiert", contactOutcome: "attempted" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-2.5 text-[10.5px] font-bold text-white hover:bg-electric disabled:opacity-50">
                          {busy === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneCall className="h-3 w-3" />} Angerufen
                        </button>
                      )}
                      {row.status === "kontaktiert" && (
                        <Link href={`/portal/leads/${row.id}#bearbeiten`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10.5px] font-bold text-white hover:bg-emerald-700"><CalendarCheck className="h-3 w-3" /> Terminieren</Link>
                      )}
                      {row.status === "termin_bestaetigt" && (
                        <button disabled={busy !== null} onClick={() => patch(row, { status: "in_beratung" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 text-[10.5px] font-bold text-white hover:bg-violet-700 disabled:opacity-50"><Flame className="h-3 w-3" /> Beratung starten</button>
                      )}
                      {row.status === "in_beratung" && (
                        <button disabled={busy !== null} onClick={() => patch(row, { status: "abgeschlossen" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10.5px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Abschließen</button>
                      )}
                      <Link href={`/portal/leads/${row.id}`} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[10.5px] font-bold text-ink hover:border-electric/30">Öffnen <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                  </article>
                ))}
                {items.length === 0 && <p className="rounded-xl border border-dashed border-line bg-white/40 p-4 text-center text-[11px] text-steel">Keine Leads in dieser Stufe.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
