import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { OrderActions } from "@/components/portal/OrderActions";
import { ProviderCommissionAction } from "@/components/portal/ProviderCommissionAction";
import { getCurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/auftraege/${id}`)}`);
  const data = await getOrder(id, user);
  if (!data) notFound();
  const customerName = data.customer.companyName || [data.customer.firstName, data.customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
  const owner = isCompensationOwner(user);
  const orderFacts: Array<[string, string | null]> = [
    ["Status", data.order.status],
    ["Providerstatus", data.order.providerStatus],
    ["Externe ID", data.order.externalOrderId],
    ["Berater", data.advisorName],
    ["Kundennummer", data.customer.customerNumber],
  ];
  if (owner) orderFacts.splice(4, 0, ["Provider-Provision", data.order.expectedCommission ? Number(data.order.expectedCommission).toLocaleString("de-DE",{style:"currency",currency:"EUR"}) : null]);
  const saleCommission = data.commissions.find((event) => event.type === "sale");

  return <div className="space-y-6">
    <Link href="/portal/auftraege" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Aufträgen</Link>
    <header><p className="eyebrow text-electric-deep">{data.order.orderNumber}</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{customerName}</h1><p className="text-[14px] text-steel">{data.providerName} · {data.productName || "Ohne Produkt"} · erstellt {formatDate(data.order.createdAt)}</p></header>
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Card><h2 className="text-[16px] font-extrabold">Auftragsdaten</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {orderFacts.map(([key,value]) => <div key={key}><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-steel">{key}</dt><dd className="mt-0.5 font-medium">{value || "–"}</dd></div>)}
        </dl></Card>
        <Card><h2 className="text-[16px] font-extrabold">Statusverlauf</h2><ol className="mt-4 space-y-3">{data.history.map((item) => <li key={item.id} className="rounded-xl bg-paper p-3 text-[14px]"><p className="font-semibold">{item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : item.toStatus}</p><p className="text-[12px] text-steel">{formatDate(item.createdAt)}{item.note ? ` · ${item.note}` : ""}</p></li>)}</ol></Card>
        <Card><h2 className="text-[16px] font-extrabold">Provisionen / Storno</h2>{owner ? (data.commissions.length === 0 ? <p className="mt-3 text-[14px] text-steel">Keine Provisionsbuchungen.</p> :
          <ul className="mt-3 divide-y divide-line">{data.commissions.map((event) => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]"><div><p className="font-semibold">{event.type} · {event.status}</p><p className="text-[12px] text-steel">{formatDate(event.createdAt)}</p></div><div className="text-right"><p>Erwartet: {Number(event.expectedAmount ?? 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p><p className="text-[12px] text-steel">Bestätigt: {Number(event.confirmedAmount ?? 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>{event.paidAmount && <p className="text-[12px] font-semibold text-emerald-700">Bezahlt: {Number(event.paidAmount).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>}</div></li>)}</ul>) : <p className="mt-3 text-[14px] text-steel">Ihre persönlichen Vergütungswerte finden Sie unter <Link href="/portal/verguetung" className="font-semibold text-electric-deep hover:underline">Vergütung & Karriere</Link>.</p>}
          {owner && saleCommission && <ProviderCommissionAction
            eventId={saleCommission.id}
            defaultAmount={Number(saleCommission.paidAmount ?? saleCommission.confirmedAmount ?? saleCommission.expectedAmount ?? 0)}
            providerReference={saleCommission.providerReference}
            alreadyPaid={saleCommission.status === "paid" || Boolean(saleCommission.paidAmount)}
          />}
        </Card>
      </div>
      <div className="lg:col-span-2"><Card><h2 className="text-[16px] font-extrabold">Bearbeiten</h2><div className="mt-4"><OrderActions orderId={id} status={data.order.status} providerStatus={data.order.providerStatus} externalOrderId={data.order.externalOrderId} /></div></Card></div>
    </div>
  </div>;
}
