"use client";

import Link from "next/link";
import { AlarmClock, ArrowRight, BriefcaseBusiness, CalendarCheck, CheckCircle2, Flame, Loader2, Mail, Phone, PhoneCall, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatDate } from "@/components/portal/ui";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS } from "@/lib/content";

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
  assignedName: string | null;
  existingProductNames: string[];
  interestProductNames: string[];
  soldProductNames: string[];
  intelligence: {
    label: string;
    detail: string;
    tone: "critical" | "high" | "normal" | "done";
  };
};

type StageLink = { key: string; label: string; href: string };

const COLUMNS = [
  { key: "neu", label: "Neu", icon: Sparkles, color: "border-t-blue-600" },
  { key: "kontaktiert", label: "Angerufen", icon: PhoneCall, color: "border-t-amber-500" },
  { key: "termin_bestaetigt", label: "Terminiert", icon: CalendarCheck, color: "border-t-emerald-600" },
  { key: "in_beratung", label: "In Beratung", icon: Flame, color: "border-t-violet-600" },
  { key: "abgeschlossen", label: "Abgeschlossen", icon: CheckCircle2, color: "border-t-emerald-700" },
  { key: "verloren", label: "Nicht zustande", icon: ArrowRight, color: "border-t-slate-500" },
] as const;

const PRIORITY: Record<string, string> = {
  hot: "border-red-800 bg-red-950/40 text-red-200",
  high: "border-amber-800 bg-amber-950/40 text-amber-200",
  normal: "border-blue-800 bg-blue-950/50 text-blue-200",
  low: "border-slate-700 bg-slate-950/50 text-slate-200",
};

const INTELLIGENCE: Record<Row["intelligence"]["tone"], string> = {
  critical: "border-red-800 bg-red-950/40 text-red-200",
  high: "border-amber-800 bg-amber-950/40 text-amber-200",
  normal: "border-blue-800 bg-blue-950/50 text-slate-100",
  done: "border-emerald-800 bg-emerald-950/40 text-emerald-200",
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2";
const ACTION = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${FOCUS}`;

function ProductSummary({ label, names, className }: { label: string; names: string[]; className: string }) {
  if (!names.length) return null;
  return (
    <p className={`rounded-lg border px-2.5 py-2 text-sm leading-relaxed ${className}`}>
      <span className="font-semibold">{label}:</span> {names.slice(0, 2).join(", ")}
      {names.length > 2 && <span> · +{names.length - 2} weitere in der Akte</span>}
    </p>
  );
}

export function LeadPipelineBoard({ rows, canEdit, activeStatus, stageLinks }: {
  rows: Row[];
  canEdit: boolean;
  activeStatus: string;
  stageLinks: StageLink[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saving = useRef(false);
  const grouped = useMemo(() => new Map(COLUMNS.map((column) => [column.key, rows.filter((row) => row.status === column.key)])), [rows]);
  const visibleColumns = activeStatus ? COLUMNS.filter((column) => column.key === activeStatus) : COLUMNS;

  // Keep the immediate double-click lock until the server refresh has committed.
  useEffect(() => {
    if (!isPending) saving.current = false;
  }, [isPending]);

  function startConsultation(row: Row) {
    if (!canEdit || saving.current || isPending) return;
    saving.current = true;
    setBusyId(row.id);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/leads/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_beratung" }),
          signal: AbortSignal.timeout(15000),
        });
        const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "Die Änderung konnte nicht bestätigt werden. Bitte prüfe den Status in der Lead-Akte.");
        }
        setSuccess(`${row.name} ist jetzt in Beratung.`);
      } catch (problem) {
        const uncertain = problem instanceof TypeError || (problem instanceof DOMException && ["TimeoutError", "AbortError"].includes(problem.name));
        setError(uncertain
          ? "Die Verbindung wurde unterbrochen. Ob die Änderung gespeichert wurde, ist unklar. Prüfe den aktualisierten Status vor einem weiteren Versuch."
          : problem instanceof Error ? problem.message : "Die Änderung konnte nicht gespeichert werden.");
      }
      // Refresh on uncertain network outcomes as well; never retry a write automatically.
      startTransition(() => router.refresh());
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <label htmlFor="pipeline-stage" className="mb-2 block text-sm font-semibold text-slate-100 lg:hidden">Vertriebsstufe anzeigen</label>
        <select
          id="pipeline-stage"
          value={activeStatus}
          disabled={isPending}
          onChange={(event) => {
            const stage = stageLinks.find((item) => item.key === event.target.value);
            if (stage) {
              setBusyId(null);
              setSuccess(null);
              setError(null);
              startTransition(() => router.push(stage.href, { scroll: false }));
            }
          }}
          className={`min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 disabled:opacity-60 lg:hidden ${FOCUS}`}
        >
          {stageLinks.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
        </select>
        <nav aria-label="Vertriebsstufe filtern" className="hidden flex-wrap gap-2 lg:flex">
          {stageLinks.map((stage) => (
            <Link
              key={stage.key}
              href={stage.href}
              scroll={false}
              aria-current={stage.key === activeStatus ? "page" : undefined}
              className={`${ACTION} ${stage.key === activeStatus ? "bg-ink text-white" : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-electric hover:text-electric-deep"}`}
            >{stage.label}</Link>
          ))}
        </nav>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">Die Zahlen an den Stufen zählen die Leads auf dieser Seite. Wähle eine Stufe, um alle passenden Leads seitenweise zu bearbeiten.</p>
      </div>

      {!canEdit && <p className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">Nur Lesezugriff: Du kannst Lead-Akten öffnen, aber keine Daten ändern.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm leading-relaxed text-red-200">{error}</p>}
      <div role="status" aria-live="polite" aria-atomic="true">
        {isPending ? <p className="flex items-center gap-2 rounded-xl border border-blue-800 bg-blue-950/50 px-4 py-3 text-sm text-blue-200"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> {busyId !== null ? "Änderung wird gespeichert und die Ansicht aktualisiert …" : "Ansicht wird aktualisiert …"}</p>
          : success ? <p className="flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {success}</p> : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-100">Keine passenden Leads</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-300">Ändere die Suche oder die Filter. Neue Leads erscheinen hier, sobald sie für dich sichtbar sind.</p>
        </div>
      ) : (
        <div aria-busy={isPending} className={activeStatus ? "space-y-4" : "grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3"}>
          {visibleColumns.map(({ key, label, icon: Icon, color }) => {
            const items = grouped.get(key) ?? [];
            return (
              <section key={key} aria-labelledby={`stage-${key}`} className={`min-w-0 rounded-2xl border border-slate-700 border-t-4 bg-slate-950/50 p-3 sm:p-4 ${color}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id={`stage-${key}`} className="flex items-center gap-2 text-base font-bold text-slate-100"><Icon aria-hidden="true" className="h-5 w-5 text-slate-300" />{label}</h2>
                  <span aria-label={`${items.length} Leads auf dieser Seite`} className="min-w-8 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-sm font-semibold text-slate-100">{items.length}</span>
                </div>
                <div className={activeStatus ? "grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3" : "space-y-4"}>
                  {items.map((row) => (
                    <article key={row.id} aria-labelledby={`lead-${row.id}`} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-slate-400">Lead #{row.id}</span>
                        <span className={`rounded-md border px-2 py-1 text-sm font-semibold ${PRIORITY[row.priority] ?? PRIORITY.normal}`}>{LEAD_PRIORITY_LABELS[row.priority] ?? row.priority}</span>
                      </div>
                      <h3 id={`lead-${row.id}`} className="mt-1">
                        <Link href={`/portal/leads/${row.id}`} className={`inline-flex min-h-11 max-w-full items-center break-words rounded-md text-base font-bold leading-snug text-slate-100 hover:text-electric-deep ${FOCUS}`}>{row.name}</Link>
                      </h3>
                      {row.audience === "b2b" && <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200"><BriefcaseBusiness aria-hidden="true" className="h-4 w-4" /> Geschäftskunde</p>}
                      {row.companyName && <p className="break-words text-sm text-slate-200">{row.companyName}</p>}
                      <p className="mt-1 break-words text-sm leading-relaxed text-slate-300">{row.topic || "Thema noch nicht erfasst"}</p>

                      <dl className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-sm leading-relaxed">
                        <div className="flex flex-wrap gap-x-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-300"><UserRound aria-hidden="true" className="h-4 w-4" /> Zuständig:</dt><dd className="break-words font-semibold text-slate-100">{row.assignedName ?? "Noch nicht zugewiesen"}</dd></div>
                        <div className="flex flex-wrap gap-x-1.5"><dt className="text-slate-300">Angelegt von:</dt><dd className="break-words text-slate-100">{row.createdByName ?? "Website / System"}</dd></div>
                        <div className="flex flex-wrap gap-x-1.5"><dt className="text-slate-300">Kontakt:</dt><dd className="text-slate-100">{LEAD_CONTACT_OUTCOME_LABELS[row.contactOutcome] ?? row.contactOutcome}</dd></div>
                      </dl>

                      {(row.phone || row.email) && (
                        <div className="mt-3 grid gap-2">
                          {row.phone && <a href={`tel:${row.phone}`} className={`${ACTION} justify-start border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-950/50`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="break-all">{row.phone}</span></a>}
                          {row.email && <a href={`mailto:${row.email}`} className={`${ACTION} justify-start border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-950/50`}><Mail aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="break-all">{row.email}</span></a>}
                        </div>
                      )}

                      <div className={`mt-3 rounded-xl border p-3 ${INTELLIGENCE[row.intelligence.tone]}`}>
                        <p className="text-sm font-bold">{row.intelligence.label}</p>
                        <p className="mt-1 text-sm leading-relaxed">{row.intelligence.detail}</p>
                      </div>
                      {row.nextActionAt && (
                        <p className={`mt-3 flex items-start gap-2 text-sm font-semibold leading-relaxed ${row.nextActionOverdue ? "text-red-200" : "text-slate-200"}`}><AlarmClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>{row.nextActionOverdue ? "Überfällige Wiedervorlage" : "Nächste Aktion"}<br /><time dateTime={row.nextActionAt}>{formatDate(row.nextActionAt)} · Berlin</time></span></p>
                      )}
                      {row.confirmedSlot && !["abgeschlossen", "verloren"].includes(row.status) && <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-slate-200"><CalendarCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Vereinbarter Termin:</strong> {row.confirmedSlot}</span></p>}
                      {row.existingProductNames.length + row.interestProductNames.length + row.soldProductNames.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <ProductSummary label="Hat bereits" names={row.existingProductNames} className="border-sky-800 bg-sky-950/40 text-sky-200" />
                          <ProductSummary label="Interesse" names={row.interestProductNames} className="border-amber-800 bg-amber-950/40 text-amber-200" />
                          <ProductSummary label="Abgeschlossen" names={row.soldProductNames} className="border-emerald-800 bg-emerald-950/40 text-emerald-200" />
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                        {canEdit && row.status === "neu" && <Link href={`/portal/leads/${row.id}#bearbeiten`} className={`${ACTION} bg-ink text-white hover:bg-electric-deep`}><PhoneCall aria-hidden="true" className="h-4 w-4" /> Anruf erfassen</Link>}
                        {canEdit && row.status === "kontaktiert" && <Link href={`/portal/leads/${row.id}#bearbeiten`} className={`${ACTION} bg-ink text-white hover:bg-electric-deep`}><CalendarCheck aria-hidden="true" className="h-4 w-4" /> Termin planen</Link>}
                        {canEdit && row.status === "termin_bestaetigt" && <button type="button" disabled={isPending} onClick={() => startConsultation(row)} className={`${ACTION} bg-ink text-white hover:bg-electric-deep disabled:cursor-wait disabled:opacity-60`}>{isPending && busyId === row.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Flame aria-hidden="true" className="h-4 w-4" />} Beratung starten</button>}
                        {canEdit && row.status === "in_beratung" && <Link href={`/portal/leads/${row.id}#bearbeiten`} className={`${ACTION} bg-ink text-white hover:bg-electric-deep`}><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Abschluss prüfen</Link>}
                        <Link href={`/portal/leads/${row.id}`} className={`${ACTION} border border-slate-700 text-slate-100 hover:bg-slate-950/50`} aria-label={`Lead-Akte von ${row.name} öffnen`}>Akte öffnen <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                      </div>
                    </article>
                  ))}
                  {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-600 bg-slate-900 p-5 text-sm leading-relaxed text-slate-300">Keine Leads in dieser Stufe auf der aktuellen Seite.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
