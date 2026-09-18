import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FilePlus2, Mail, Phone } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/kunden/${id}`)}`);
  const data = await getCustomer(id, user);
  if (!data) notFound();
  const { customer } = data;
  const name = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name";

  return <div className="space-y-6">
    <Link href="/portal/kunden" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Kunden</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">{customer.customerNumber}</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{name}</h1><p className="text-[14px] text-steel">Kunde seit {formatDate(customer.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2">
        {customer.phone && <a href={`tel:${customer.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Phone className="h-4 w-4" /> Telefon</a>}
        {customer.email && <a href={`mailto:${customer.email}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Mail className="h-4 w-4" /> E-Mail</a>}
        <Link href={`/portal/auftraege/neu?customer=${customer.id}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><FilePlus2 className="h-4 w-4" /> Auftrag anlegen</Link>
      </div>
    </header>
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2"><h2 className="text-[16px] font-extrabold">Stammdaten</h2><dl className="mt-4 space-y-3 text-[14px]">
        {[
          ["Typ", customer.type === "business" ? "Geschäftskunde" : "Privatkunde"],
          ["E-Mail", customer.email],
          ["Telefon", customer.phone],
          ["PLZ / Ort", [customer.postalCode, customer.city].filter(Boolean).join(" ")],
          ["Bevorzugter Kanal", customer.preferredChannel],
          ["Tags", customer.tags.join(", ")],
        ].map(([key, value]) => <div key={key as string}><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-steel">{key}</dt><dd className="mt-0.5 font-medium">{value || "–"}</dd></div>)}
      </dl></Card>
      <Card className="lg:col-span-3"><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Aufträge</h2><span className="text-[12.5px] text-steel">{data.orders.length}</span></div>
        {data.orders.length === 0 ? <p className="mt-6 text-[14px] text-steel">Noch keine Aufträge.</p> :
        <ul className="mt-3 divide-y divide-line">{data.orders.map((row) => <li key={row.order.id}><Link href={`/portal/auftraege/${row.order.id}`} className="block py-3">
          <div className="flex items-center justify-between gap-3"><p className="font-semibold">{row.order.orderNumber} · {row.providerName}</p><span className="chip border-line bg-white">{row.order.status}</span></div>
          <p className="text-[12.5px] text-steel">{row.productName || "Ohne Produkt"} · {formatDate(row.order.createdAt)}</p>
        </Link></li>)}</ul>}
      </Card>
    </div>
  </div>;
}
