import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Network, Plus, Search } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/enterprise";
import { hasPermission, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkunden");
  const { q } = await searchParams;
  const rows = await listCustomers(user, q, 150);
  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.CUSTOMER_EDIT, PORTAL_PERMISSION.CUSTOMER_EXPORT] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canExport = user.role === "admin" || capabilities[PORTAL_PERMISSION.CUSTOMER_EXPORT];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">CRM · Kundenreise</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Kunden</h1><p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-steel">{rows.length} Kunden · Herkunft, Aufträge und Empfehlungsnetzwerk bleiben miteinander verknüpft.</p></div>
      <div className="flex gap-2">
        {canExport && <a href="/api/portal/enterprise/export?type=customers" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>}
        {canEdit && <Link href="/portal/kunden/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Kunde anlegen</Link>}
      </div>
    </header>
    <form className="relative">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
      <input name="q" defaultValue={q ?? ""} className="field pl-11" placeholder="Kundennummer, Name, Firma, E-Mail oder Telefon suchen …" />
    </form>
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
            </div>
            <p className="mt-0.5 text-[13px] text-steel">{customer.email || "Keine E-Mail"} · {customer.phone || "Kein Telefon"} · {customer.city || "Ort offen"}</p>
          </div>
          <p className="text-[12px] text-steel">Aktualisiert {formatDate(customer.updatedAt)}</p>
        </Link></li>;
      })}</ul>}
    </Card>
  </div>;
}
