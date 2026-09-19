import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, Search } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { listOrders } from "@/lib/enterprise";
import { ORDER_STATUSES } from "@/lib/enterprise-validation";
import { isCompensationOwner } from "@/lib/compensation";

const LABELS: Record<string, string> = {
  draft:"Entwurf", documents_missing:"Unterlagen fehlen", ready_to_submit:"Einreichbereit", submitted:"Eingereicht",
  provider_review:"Provider-Prüfung", accepted:"Angenommen", activation_pending:"Aktivierung offen", active:"Aktiv",
  rejected:"Abgelehnt", cancelled:"Storniert", storno:"Storno",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fauftraege");
  const { status, q } = await searchParams;
  const validStatus = status && ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number]) ? status : undefined;
  const rows = await listOrders(user, { status: validStatus, search: q }, 200);
  const owner = isCompensationOwner(user);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">Operations</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufträge & Verträge</h1><p className="text-[14px] text-steel">{rows.length} Vorgänge in dieser Ansicht</p></div>
      <div className="flex gap-2"><a href="/api/portal/enterprise/export?type=orders" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>
      <Link href="/portal/auftraege/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Auftrag anlegen</Link></div>
    </header>
    <form className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input name="q" defaultValue={q ?? ""} className="field pl-11" placeholder="Auftrag, Kunde, externe ID …" /></div>
      <select name="status" defaultValue={validStatus ?? ""} className="field"><option value="">Alle Status</option>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}</select>
    </form>
    <Card className="p-0 sm:p-0">{rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufträge gefunden.</p> :
      <ul className="divide-y divide-line">{rows.map((row) => {
        const customerName = row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" ");
        return <li key={row.order.id}><Link href={`/portal/auftraege/${row.order.id}`} className="grid gap-3 px-5 py-4 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{row.order.orderNumber}</p><span className="text-[12px] text-steel">{customerName}</span></div>
          <p className="mt-0.5 text-[13px] text-steel">{row.providerName} · {row.productName || "ohne Produkt"} · {row.advisorName || "ohne Berater"} · {formatDate(row.order.updatedAt)}</p></div>
          <div className="flex items-center gap-2"><span className="chip border-line bg-white">{LABELS[row.order.status] ?? row.order.status}</span>{owner && row.order.expectedCommission && <span className="text-[13px] font-semibold">{Number(row.order.expectedCommission).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</span>}</div>
        </Link></li>;
      })}</ul>}
    </Card>
  </div>;
}
