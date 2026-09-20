import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { OrderCreateForm } from "@/components/portal/OrderCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";
import { listCatalog, listCustomers } from "@/lib/enterprise";
import { listLeads } from "@/lib/queries";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ lead?: string; customer?: string; product?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fauftraege%2Fneu");
  if (!await hasPermission(user, PORTAL_PERMISSION.ORDER_CREATE)) redirect("/portal/auftraege");
  const params = await searchParams;
  const initialLeadId = params.lead && /^\d+$/.test(params.lead) ? Number(params.lead) : undefined;
  const initialCustomerId = params.customer && /^\d+$/.test(params.customer) ? Number(params.customer) : undefined;
  const initialProductId = params.product && /^\d+$/.test(params.product) ? Number(params.product) : undefined;
  const [customerRows, leadRows, catalog] = await Promise.all([listCustomers(user, undefined, 200), listLeads({}, user), listCatalog()]);
  const initialProduct = initialProductId ? catalog.products.find((product) => product.id === initialProductId) : undefined;
  const owner = isCompensationOwner(user);
  const customerOptions = customerRows.map((customer) => ({
    id: customer.id,
    customerNumber: customer.customerNumber,
    label: customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name",
  }));
  if (initialCustomerId) {
    const selected = customerOptions.find((customer) => customer.id === initialCustomerId);
    if (selected) customerOptions.splice(0, 0, selected);
  }
  return <div className="space-y-6">
    <Link href="/portal/auftraege" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
    <header><p className="eyebrow text-electric-deep">Operations</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Auftrag anlegen</h1></header>
    <Card><OrderCreateForm
      customers={customerOptions}
      leads={leadRows.map((lead) => ({ id: lead.id, label: `${lead.name || `Lead #${lead.id}`} · ${lead.topic || "ohne Thema"}` }))}
      providers={catalog.providers.map((provider) => ({ id: provider.id, name: provider.name, category: provider.category }))}
      products={catalog.products.map((product) => ({ id: product.id, providerId: product.providerId, name: product.name, category: product.category, expectedCommission: owner ? product.expectedCommission : null }))}
      initialLeadId={initialLeadId}
      initialProductId={initialProduct?.id}
      initialProviderId={initialProduct?.providerId}
      canEditCommission={owner}
    /></Card>
  </div>;
}
