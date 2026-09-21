import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Download, Network, Plus, Search, Target } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/enterprise";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; focus?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkunden");
  const { q, focus: rawFocus, page: rawPage } = await searchParams;
  const focus = rawFocus && ["review", "opportunity", "risk"].includes(rawFocus) ? rawFocus as "review" | "opportunity" | "risk" : undefined;
  const parsedPage = rawPage ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;
  const queriedRows = await listCustomers(user, q, pageSize, { focus, page, lookahead: true });
  const hasNextPage = queriedRows.length > pageSize;
  const rows = queriedRows.slice(0, pageSize);
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;
  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.CUSTOMER_EDIT, PORTAL_PERMISSION.CUSTOMER_EXPORT] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canExport = user.role === "admin" || capabilities[PORTAL_PERMISSION.CUSTOMER_EXPORT];

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (focus) params.set("focus", focus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/portal/kunden${query ? `?${query}` : ""}`;
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">CRM · Kundenreise</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Kunden</h1><p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-steel">{rows.length ? `Kunden ${rangeStart}–${rangeEnd}` : "Keine Kunden in dieser Ansicht"} · Herkunft, Aufträge und Empfehlungsnetzwerk bleiben miteinander verknüpft.</p></div>
      <div className="flex gap-2">
        {canExport && <a href="/api/portal/enterprise/export?type=customers" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>}
        {canEdit && <Link href="/portal/kunden/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Kunde anlegen</Link>}
      </div>
    </header>
    <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
      <form className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input type="hidden" name="focus" value={focus ?? ""} />
        <input name="q" defaultValue={q ?? ""} className="field pl-11" placeholder="Kundennummer, Name, Firma, E-Mail oder Telefon suchen …" />
      </form>
      <div className="flex flex-wrap gap-2">
        {[
          ["Alle", undefined, CheckCircle2],
          ["Review fällig", "review", Clock3],
          ["Potenzial offen", "opportunity", Target],
          ["Risiko", "risk", AlertTriangle],
        ].map(([label, value, Icon]) => {
          const active = focus === value || (!focus && value === undefined);
          const href = value ? `/portal/kunden?focus=${value}` : "/portal/kunden";
          const IconComponent = Icon as typeof Clock3;
          return <Link key={String(label)} href={href} className={"inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold transition " + (active ? "border-ink bg-ink text-white" : "border-line bg-white text-steel hover:border-electric/30 hover:text-electric-deep")}><IconComponent className="h-3.5 w-3.5" /> {String(label)}</Link>;
        })}
      </div>
    </div>
    <Card className="p-0 sm:p-0">
      {rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Kunden gefunden.</p> :
      <ul className="divide-y divide-line">{rows.map((customer) => {
        const name = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
        return <li key={customer.id}><Link href={`/portal/kunden/${customer.id}`} className="grid gap-3 px-5 py-4 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{name}</p>
              <span className="text-[12px] text-steel">{customer.customerNumber}</span>
              {customer.referredByName && <span className="inline-flex items-center gap-1 rounded-full border border-electric/15 bg-electric/[0.06] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Network className="h-3 w-3" /> von {customer.referredByName}</span>}
              {customer.referralCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><Network className="h-3 w-3" /> {customer.referralCount} Empfehlung{customer.referralCount === 1 ? "" : "en"}</span>}
              {customer.activeOrderCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {customer.activeOrderCount} aktiv</span>}
              {customer.openOpportunityCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-electric/20 bg-electric/[0.06] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Target className="h-3 w-3" /> {customer.openOpportunityCount} Potenzial</span>}
              {customer.reviewOverdue && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800"><Clock3 className="h-3 w-3" /> Review fällig</span>}
              {(customer.relationshipStatus === "at_risk" || customer.crmRiskLevel === "high" || customer.crmRiskLevel === "critical") && <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700"><AlertTriangle className="h-3 w-3" /> Risiko</span>}
            </div>
            <p className="mt-0.5 text-[13px] text-steel">{customer.email || "Keine E-Mail"} · {customer.phone || "Kein Telefon"} · {customer.city || "Ort offen"}</p>
          </div>
          <div className="text-[12px] text-steel sm:text-right"><p>Aktualisiert {formatDate(customer.updatedAt)}</p>{customer.lastContactAt && <p className="mt-0.5">Kontakt {formatDate(customer.lastContactAt)}</p>}{customer.nextReviewAt && <p className="mt-0.5">Review {formatDate(customer.nextReviewAt)}</p>}</div>
        </Link></li>;
      })}</ul>}
    </Card>
    {(hasPreviousPage || hasNextPage || rows.length > 0) && <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-28px_rgba(6,11,22,0.45)]" aria-label="Kunden-Seiten">
      <p className="text-[11.5px] font-semibold text-steel">{rows.length ? `Kunden ${rangeStart}–${rangeEnd}` : "Keine Kunden auf dieser Seite"}</p>
      <div className="flex items-center gap-2">
        {hasPreviousPage ? <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-electric/30">Zurück</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Zurück</span>}
        <span className="min-w-20 text-center text-[11.5px] font-extrabold text-ink">Seite {page}</span>
        {hasNextPage ? <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Weiter</span>}
      </div>
    </nav>}
  </div>;
}
