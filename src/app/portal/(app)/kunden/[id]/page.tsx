import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FilePlus2, Mail, Network, Phone, UserRoundCheck } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { CustomerReferralManager } from "@/components/portal/CustomerReferralManager";
import { CustomerEditForm } from "@/components/portal/CustomerEditForm";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer } from "@/lib/enterprise";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/kunden/${id}`)}`);
  const data = await getCustomer(id, user);
  if (!data) notFound();
  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.CUSTOMER_EDIT, PORTAL_PERMISSION.ORDER_CREATE] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canCreateOrder = capabilities[PORTAL_PERMISSION.ORDER_CREATE];
  const { customer } = data;
  const name = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
  const hasContact = Boolean(customer.phone || customer.email);
  const referralRows = data.referrals.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  return <div className="space-y-6">
    <Link href="/portal/kunden" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Kunden</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">{customer.customerNumber}</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{name}</h1><p className="text-[14px] text-steel">Kunde seit {formatDate(customer.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2">
        {customer.phone && <a href={`tel:${customer.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Phone className="h-4 w-4" /> Telefon</a>}
        {customer.email && <a href={`mailto:${customer.email}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Mail className="h-4 w-4" /> E-Mail</a>}
        {canCreateOrder && <Link href={`/portal/auftraege/neu?customer=${customer.id}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><FilePlus2 className="h-4 w-4" /> Auftrag anlegen</Link>}
      </div>
    </header>

    <section className="grid gap-2 sm:grid-cols-3" aria-label="Kunden-Workflow">
      <div className={"rounded-2xl border px-4 py-3 " + (hasContact ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
        <div className="flex items-center gap-2">
          {hasContact ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <UserRoundCheck className="h-4 w-4 text-amber-700" />}
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">1 · Kontakt</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{hasContact ? "Kontaktweg vorhanden" : "Telefon oder E-Mail ergänzen"}</p>
      </div>
      <div className={"rounded-2xl border px-4 py-3 " + (data.orders.length ? "border-emerald-200 bg-emerald-50" : "border-line bg-white")}>
        <div className="flex items-center gap-2">
          <FilePlus2 className={"h-4 w-4 " + (data.orders.length ? "text-emerald-700" : "text-electric-deep")} />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">2 · Auftrag</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{data.orders.length ? data.orders.length + " Auftrag/Aufträge vorhanden" : "Bedarf klären und Auftrag anlegen"}</p>
      </div>
      <div className={"rounded-2xl border px-4 py-3 " + (data.referrals.length ? "border-electric/20 bg-electric/[0.06]" : "border-line bg-white")}>
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-electric-deep" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">3 · Empfehlungen</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{data.referrals.length ? data.referrals.length + " Empfehlung(en) erfasst" : "Nach passenden Empfehlungen fragen"}</p>
      </div>
    </section>

    {data.referralSource && (
      <section className="rounded-[20px] border border-electric/15 bg-electric/[0.05] px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-electric-deep shadow-sm"><Network className="h-4 w-4" /></span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-steel">Herkunft · Kundenempfehlung</p>
              <p className="mt-0.5 text-[13.5px] font-extrabold">Empfohlen von {data.referralSource.sourceName}</p>
              <p className="text-[11.5px] text-steel">{data.referralSource.sourceCustomerNumber}{data.referralSource.relationship ? " · " + data.referralSource.relationship : ""}</p>
            </div>
          </div>
          <Link href={"/portal/kunden/" + data.referralSource.sourceCustomerId} className="inline-flex h-9 items-center rounded-full border border-electric/20 bg-white px-3.5 text-[11.5px] font-bold text-electric-deep hover:bg-electric/[0.05]">
            Empfehlenden Kunden öffnen
          </Link>
        </div>
        {data.referralSource.note && <p className="mt-2 text-[11.5px] leading-relaxed text-steel">{data.referralSource.note}</p>}
      </section>
    )}

    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-[16px] font-extrabold">Stammdaten</h2><p className="mt-0.5 text-[11.5px] text-steel">Kontakt- und Grunddaten der Kundenakte.</p></div>
          {canEdit && <CustomerEditForm
            customerId={customer.id}
            firstName={customer.firstName}
            lastName={customer.lastName}
            companyName={customer.companyName}
            email={customer.email}
            phone={customer.phone}
            postalCode={customer.postalCode}
            city={customer.city}
            preferredChannel={customer.preferredChannel}
          />}
        </div>
        <dl className="mt-4 space-y-3 text-[14px]">
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

    <Card>
      <CustomerReferralManager
        customerId={customer.id}
        customerName={name}
        rows={referralRows}
        canEdit={canEdit}
      />
    </Card>
  </div>;
}
