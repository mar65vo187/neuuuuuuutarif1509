import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, Search } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { OrderBulkList } from "@/components/portal/OrderBulkList";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { getCurrentUser } from "@/lib/auth";
import { listOrders } from "@/lib/enterprise";
import { ORDER_STATUSES } from "@/lib/enterprise-validation";
import { isCompensationOwner } from "@/lib/compensation";
import { listSavedViews } from "@/lib/portal-productivity";

const LABELS: Record<string, string> = {
  draft:"Entwurf", documents_missing:"Unterlagen fehlen", ready_to_submit:"Einreichbereit", submitted:"Eingereicht",
  provider_review:"Provider-Prüfung", accepted:"Angenommen", activation_pending:"Aktivierung offen", active:"Aktiv",
  rejected:"Abgelehnt", cancelled:"Storniert", storno:"Storno",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fauftraege");
  const { status, q, page: rawPage } = await searchParams;
  const validStatus = status && ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number]) ? status : undefined;
  const parsedPage = rawPage ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;
  const [queriedRows, savedViews] = await Promise.all([
    listOrders(user, { status: validStatus, search: q, page, lookahead: true }, pageSize),
    listSavedViews(user, "orders"),
  ]);
  const rows = queriedRows.slice(0, pageSize);
  const hasNextPage = queriedRows.length > pageSize;
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;
  const owner = isCompensationOwner(user);

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (validStatus) params.set("status", validStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/portal/auftraege${query ? `?${query}` : ""}`;
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">Auftragssteuerung</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufträge & Verträge</h1><p className="text-[14px] text-steel">{rows.length ? `Vorgänge ${rangeStart}–${rangeEnd}` : "Keine Vorgänge in dieser Ansicht"}</p></div>
      <div className="flex gap-2"><a href="/api/portal/enterprise/export?type=orders" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>
      <Link href="/portal/auftraege/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Auftrag anlegen</Link></div>
    </header>
    <form className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input name="q" defaultValue={q ?? ""} className="field pl-11" placeholder="Auftrag, Kunde, externe ID …" /></div>
      <select name="status" defaultValue={validStatus ?? ""} className="field"><option value="">Alle Status</option>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}</select>
    </form>
    <SavedViewsBar area="orders" basePath="/portal/auftraege" views={savedViews} currentFilters={{ ...(validStatus ? { status: validStatus } : {}), ...(q?.trim() ? { q: q.trim() } : {}) }} />
    <Card className="p-0 sm:p-0">{rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufträge gefunden.</p> :
      <OrderBulkList showCommission={owner} rows={rows.map((row) => ({
        id: row.order.id,
        orderNumber: row.order.orderNumber,
        customerName: row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" "),
        providerName: row.providerName,
        productName: row.productName,
        advisorName: row.advisorName,
        updatedAt: row.order.updatedAt.toISOString(),
        status: row.order.status,
        expectedCommission: owner ? row.order.expectedCommission : null,
      }))} />}
    </Card>
    {(hasPreviousPage || hasNextPage || rows.length > 0) && <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-28px_rgba(6,11,22,0.45)]" aria-label="Auftrags-Seiten">
      <p className="text-[11.5px] font-semibold text-steel">{rows.length ? `Vorgänge ${rangeStart}–${rangeEnd}` : "Keine Vorgänge auf dieser Seite"}</p>
      <div className="flex items-center gap-2">
        {hasPreviousPage ? <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-electric/30">Zurück</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Zurück</span>}
        <span className="min-w-20 text-center text-[11.5px] font-extrabold text-ink">Seite {page}</span>
        {hasNextPage ? <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Weiter</span>}
      </div>
    </nav>}
  </div>;
}
