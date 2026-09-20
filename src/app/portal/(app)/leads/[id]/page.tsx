import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AlertTriangle, ArrowLeft, BrainCircuit, FilePlus2, Mail, MessageCircle, Phone } from "lucide-react";
import { LeadActions } from "@/components/portal/LeadActions";
import { LeadProductManager } from "@/components/portal/LeadProductManager";
import { Card, StatusBadge, TypeBadge, formatDate } from "@/components/portal/ui";
import { getLead, getLeadNotes, getLeadProductLinks, listLeadProductOptions } from "@/lib/queries";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS, SITUATIONS } from "@/lib/content";
import { getLeadIntelligence } from "@/lib/lead-intelligence";

export const dynamic = "force-dynamic";

function toBerlinDateTimeInput(value: Date | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/leads/${id}`)}`);
  const lead = await getLead(id, user);
  if (!lead) notFound();
  const [notes, leadProducts, productOptions] = await Promise.all([
    getLeadNotes(id),
    getLeadProductLinks(id, user),
    listLeadProductOptions(),
  ]);
  const situation = SITUATIONS.find((s) => s.value === lead.situation)?.label ?? lead.situation;
  const waDigits = lead.phone?.replace(/[^\d+]/g, "").replace(/^\+|^00/, "").replace(/^0/, "49").replace(/\D/g, "");
  const meta = (lead.meta ?? {}) as Record<string, unknown>;
  const intelligence = getLeadIntelligence(lead);
  const intelligenceTone = {
    critical: "border-red-200 bg-red-50 text-red-900",
    high: "border-amber-200 bg-amber-50 text-amber-900",
    normal: "border-electric/15 bg-electric/[0.06] text-ink",
    done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[intelligence.tone];

  return (
    <div className="space-y-6">
      <Link href="/portal/leads" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zur Liste</Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><TypeBadge type={lead.type} /><StatusBadge status={lead.status} /><span className="text-[12.5px] text-steel">#{lead.id}</span></div>
          <h1 className="mt-3 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{lead.name}</h1>
          <p className="text-[14px] text-steel">Eingegangen {formatDate(lead.createdAt)} · Quelle: {lead.source ?? "website"} · Angelegt von: {lead.createdByName ?? "Website / System"}{lead.advisorName ? ` · Wunschberater: ${lead.advisorName}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {waDigits && <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-[13.5px] font-semibold text-ink-900"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Phone className="h-4 w-4" /> {lead.phone}</a>}
          <Link href={`/portal/auftraege/neu?lead=${lead.id}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><FilePlus2 className="h-4 w-4" /> Auftrag anlegen</Link>
          <a href={`mailto:${lead.email}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Mail className="h-4 w-4" /> E-Mail</a>
        </div>
      </header>

      <section className={`rounded-[22px] border p-4 sm:p-5 ${intelligenceTone}`} aria-label="Next Best Action">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><BrainCircuit className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] opacity-70">Next Best Action</p>
              <h2 className="mt-1 text-[16px] font-extrabold">{intelligence.label}</h2>
              <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed opacity-80">{intelligence.detail}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-current/10 bg-white/50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">CRM-Vollständigkeit</p>
            <p className="mt-0.5 text-[20px] font-extrabold">{intelligence.completeness}%</p>
          </div>
        </div>
        {intelligence.missing.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Noch ergänzen:</span>
            {intelligence.missing.map((item) => <span key={item} className="rounded-full border border-current/15 bg-white/55 px-2 py-0.5">{item}</span>)}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <h2 className="text-[15px] font-extrabold">Anfrage</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
              {[
                ["Thema", lead.topic],
                ["Region", lead.region],
                ["Situation", situation],
                ["Wunschkanal", lead.preferredChannel],
                ["Wunschzeit", lead.preferredTime],
                ["E-Mail", lead.email],
                ["Telefon", lead.phone],
                ["Angelegt von", lead.createdByName ?? "Website / System"],
                ["Zuständig", lead.assignedName ?? "noch niemand"],
                ["Priorität", LEAD_PRIORITY_LABELS[lead.priority] ?? lead.priority],
                ["Gesprächsausgang", LEAD_CONTACT_OUTCOME_LABELS[lead.contactOutcome] ?? lead.contactOutcome],
                ["Letzter Kontakt", lead.lastContactAt ? formatDate(lead.lastContactAt) : "–"],
                ["Nächste Aktion", lead.nextActionAt ? formatDate(lead.nextActionAt) : "–"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-[12px] font-semibold uppercase tracking-wider text-steel">{k}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{(v as string | null) || "–"}</dd>
                </div>
              ))}
              {typeof meta.job === "string" && meta.job && (
                <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-steel">Aktueller Beruf</dt><dd className="mt-0.5 font-medium">{meta.job}</dd></div>
              )}
            </dl>
            {lead.message && (
              <div className="mt-5 rounded-xl bg-paper p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-steel">Nachricht</p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed">{lead.message}</p>
              </div>
            )}
            {lead.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {lead.tags.map((tag) => <span key={tag} className="chip border-champagne/25 bg-champagne/10 text-ink-700">{tag}</span>)}
              </div>
            )}
            {lead.confirmedSlot && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[14px] text-emerald-900">
                <span className="font-bold">Termin:</span> {lead.confirmedSlot} <span className="text-emerald-800/70">(eingetragen am {formatDate(lead.confirmedAt)})</span>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-[15px] font-extrabold">Verlauf</h2>
            <ol className="mt-4 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className={`rounded-xl p-3 text-[14px] ${n.kind === "system" ? "bg-paper text-steel" : "border border-line bg-white"}`}>
                  <p className={n.kind === "system" ? "" : "whitespace-pre-line text-ink"}>{n.body}</p>
                  <p className="mt-1 text-[11.5px] text-steel">{formatDate(n.createdAt)}{n.authorName ? ` · ${n.authorName}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="text-[15px] font-extrabold">Produkte & Potenzial</h2>
            <p className="mt-1 text-[12px] text-steel">Direkt sichtbar: vorhandene Produkte, Interessen und Abschlüsse.</p>
            <div className="mt-4">
              <LeadProductManager
                leadId={lead.id}
                products={productOptions}
                links={leadProducts.map((item) => ({
                  productId: item.productId,
                  relation: item.relation,
                  note: item.note,
                  productName: item.productName,
                  category: item.category,
                  providerName: item.providerName,
                }))}
              />
            </div>
          </Card>

          <div id="bearbeiten">
          <Card>
            <h2 className="text-[15px] font-extrabold">Bearbeiten</h2>
            <div className="mt-4">
              <LeadActions
                leadId={lead.id}
                status={lead.status}
                confirmedSlot={lead.confirmedSlot}
                assigned={Boolean(lead.assignedEmployeeId)}
                isAppointment={lead.type === "termin"}
                priority={lead.priority}
                contactOutcome={lead.contactOutcome}
                nextActionInput={toBerlinDateTimeInput(lead.nextActionAt)}
                tags={lead.tags}
              />
            </div>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
