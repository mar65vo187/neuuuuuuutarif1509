import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, FileCheck2, Search, ShieldCheck, UserRound } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { listAuditEvents } from "@/lib/enterprise";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit & Compliance", robots: { index: false, follow: false } };

const ENTITY_OPTIONS = [
  ["lead", "Lead"],
  ["customer", "Kunde"],
  ["order", "Auftrag"],
  ["task", "Aufgabe"],
  ["employee", "Mitarbeiter"],
  ["commission", "Provision"],
  ["automation", "Automation"],
  ["system", "System"],
] as const;

function prettyPayload(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = JSON.stringify(value, null, 2) ?? "";
  return raw.length > 6000 ? raw.slice(0, 6000) + "\n…" : raw;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faudit");
  if (!await hasPermission(user, PORTAL_PERMISSION.AUDIT_READ)) redirect("/portal");

  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) || undefined;
  const entity = params.entity?.trim().slice(0, 60) || undefined;
  const parsedPage = params.page ? Number(params.page) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;

  const queriedRows = await listAuditEvents(pageSize, {
    page,
    lookahead: true,
    q,
    entityType: entity,
  });
  const hasNextPage = queriedRows.length > pageSize;
  const rows = queriedRows.slice(0, pageSize);
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;
  const changedRows = rows.filter(({ event }) => event.oldValues || event.newValues).length;
  const systemRows = rows.filter(({ event }) => !event.actorEmployeeId).length;

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (entity) next.set("entity", entity);
    if (nextPage > 1) next.set("page", String(nextPage));
    const query = next.toString();
    return `/portal/audit${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Governance · Nachvollziehbarkeit</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Audit & Compliance</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-steel">
            Revisionsspur für Änderungen im internen CRM: Wer hat wann welchen Datensatz oder Prozess verändert – inklusive dokumentierter Vorher-/Nachher-Werte.
          </p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-4 text-[12px] font-bold text-emerald-200">
          <ShieldCheck className="h-4 w-4" /> Nur mit Audit-Recht
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Audit Kennzahlen dieser Seite">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Ereignisse</p><FileCheck2 className="h-4 w-4 text-electric-deep" /></div>
          <p className="mt-2 text-[26px] font-extrabold">{rows.length}</p>
          <p className="text-[11px] text-steel">auf dieser Seite</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Mit Änderungssatz</p><Database className="h-4 w-4 text-electric-deep" /></div>
          <p className="mt-2 text-[26px] font-extrabold">{changedRows}</p>
          <p className="text-[11px] text-steel">Vorher-/Nachher-Daten vorhanden</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Systemereignisse</p><UserRound className="h-4 w-4 text-electric-deep" /></div>
          <p className="mt-2 text-[26px] font-extrabold">{systemRows}</p>
          <p className="text-[11px] text-steel">ohne menschlichen Akteur</p>
        </Card>
      </section>

      <Card>
        <form method="get" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative">
            <span className="sr-only">Audit durchsuchen</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
            <input name="q" defaultValue={q ?? ""} className="field h-11 pl-10" placeholder="Aktion, Akteur, Entity oder ID …" />
          </label>
          <select name="entity" defaultValue={entity ?? ""} className="field h-11">
            <option value="">Alle Datensatztypen</option>
            {ENTITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="h-11 rounded-xl bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep">Filtern</button>
            <Link href="/portal/audit" className="grid h-11 place-items-center rounded-xl border border-line bg-white px-3 text-[12px] font-bold text-steel hover:border-ink/20 hover:text-ink">Reset</Link>
          </div>
        </form>
      </Card>

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <FileCheck2 className="mx-auto h-6 w-6 text-steel" />
            <p className="mt-3 text-[14px] font-bold">Keine Audit-Ereignisse für diese Auswahl.</p>
            <p className="mt-1 text-[12px] text-steel">Filter zurücksetzen oder einen anderen Suchbegriff verwenden.</p>
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {rows.map(({ event, actorName }) => {
              const before = prettyPayload(event.oldValues);
              const after = prettyPayload(event.newValues);
              return (
                <li key={event.id} className="px-5 py-4 sm:px-6">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-electric/20 bg-electric/[0.06] px-2.5 py-1 text-[10.5px] font-extrabold text-electric-deep">{event.action}</span>
                        <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-bold text-steel">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</span>
                      </div>
                      <p className="mt-2 text-[12px] text-steel">Akteur: <span className="font-semibold text-ink">{actorName || "System"}</span></p>
                    </div>
                    <time className="text-[11.5px] font-semibold text-steel lg:text-right">{formatDate(event.createdAt)}</time>
                  </div>

                  {(before || after) && (
                    <details className="mt-3 rounded-xl border border-line bg-paper/55">
                      <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[11.5px] font-bold text-ink">Änderungssatz anzeigen</summary>
                      <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Vorher</p>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-[10.5px] leading-relaxed text-ink">{before || "–"}</pre>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Nachher</p>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-[10.5px] leading-relaxed text-ink">{after || "–"}</pre>
                        </div>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {(hasPreviousPage || hasNextPage || rows.length > 0) && (
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3" aria-label="Audit-Seiten">
          <p className="text-[11.5px] font-semibold text-silver">{rows.length ? `Ereignisse ${rangeStart}–${rangeEnd}` : "Keine Ereignisse auf dieser Seite"}</p>
          <div className="flex items-center gap-2">
            {hasPreviousPage ? <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11.5px] font-bold text-white hover:border-electric/30">Zurück</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-white/5 px-3 text-[11.5px] font-bold text-silver/40">Zurück</span>}
            <span className="min-w-20 text-center text-[11.5px] font-extrabold text-white">Seite {page}</span>
            {hasNextPage ? <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-white/5 px-3 text-[11.5px] font-bold text-silver/40">Weiter</span>}
          </div>
        </nav>
      )}
    </div>
  );
}
