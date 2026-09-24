import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { OrderCreateForm } from "@/components/portal/OrderCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";
import { getCustomer, listCatalog, listCustomers } from "@/lib/enterprise";
import { getLead, listLeads } from "@/lib/queries";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

type SearchValue = string | string[] | undefined;
function positiveId(value: SearchValue) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ lead?: SearchValue; customer?: SearchValue; product?: SearchValue }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fauftraege%2Fneu");
  const permissions = await permissionSnapshot(user, [PORTAL_PERMISSION.ORDER_CREATE, PORTAL_PERMISSION.CUSTOMER_READ, PORTAL_PERMISSION.CUSTOMER_EDIT, PORTAL_PERMISSION.LEAD_EDIT] as const);
  if (!permissions[PORTAL_PERMISSION.ORDER_CREATE]) redirect("/portal/auftraege");
  const canUseCustomers = permissions[PORTAL_PERMISSION.CUSTOMER_READ] || permissions[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canCreateCustomer = permissions[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canUseLeads = permissions[PORTAL_PERMISSION.LEAD_EDIT] && canUseCustomers;
  const params = await searchParams;
  const requestedLeadId = positiveId(params.lead);
  const requestedCustomerId = positiveId(params.customer);
  const requestedProductId = positiveId(params.product);
  const [customerRows, leadRows, catalog] = await Promise.all([
    canUseCustomers ? listCustomers(user, undefined, 200) : Promise.resolve([]),
    canUseLeads ? listLeads({}, user) : Promise.resolve([]),
    listCatalog(),
  ]);
  // Direct links from an older record must work beyond the selector's initial window.
  const [extraCustomer, extraLead] = await Promise.all([
    canUseCustomers && requestedCustomerId && !customerRows.some((row) => row.id === requestedCustomerId) ? getCustomer(requestedCustomerId, user) : Promise.resolve(null),
    canUseLeads && requestedLeadId && !leadRows.some((row) => row.id === requestedLeadId) ? getLead(requestedLeadId, user) : Promise.resolve(null),
  ]);
  if (extraCustomer) customerRows.unshift(extraCustomer.customer as typeof customerRows[number]);
  if (extraLead) leadRows.unshift(extraLead);
  const initialCustomerId = customerRows.some((row) => row.id === requestedCustomerId) ? requestedCustomerId : undefined;
  const initialLeadId = !initialCustomerId && leadRows.some((row) => row.id === requestedLeadId) ? requestedLeadId : undefined;
  const initialProduct = catalog.products.find((product) => product.id === requestedProductId);
  const sourceUnavailable = (params.customer !== undefined && !initialCustomerId) || (params.lead !== undefined && !initialCustomerId && !initialLeadId);
  const owner = isCompensationOwner(user);
  const customerOptions = customerRows.map((customer) => ({
    id: customer.id,
    customerNumber: customer.customerNumber,
    label: customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name",
  }));
  return <div className="space-y-6">
    <Link href="/portal/auftraege" className="inline-flex min-h-11 items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück zu Aufträgen</Link>
    <header><p className="eyebrow text-electric-deep">Auftragssteuerung</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Auftrag anlegen</h1></header>
    {sourceUnavailable && <p role="status" className="rounded-xl border border-amber-200/30 bg-amber-50 p-4 text-sm text-amber-800">Der vorausgewählte Kontakt ist nicht verfügbar. Bitte wähle einen zugänglichen Kunden oder Lead aus.</p>}
    <Card><OrderCreateForm
      customers={customerOptions}
      leads={leadRows.map((lead) => ({ id: lead.id, label: `${lead.name || `Lead #${lead.id}`} · ${lead.topic || "ohne Thema"}` }))}
      providers={catalog.providers.map((provider) => ({ id: provider.id, name: provider.name, category: provider.category }))}
      products={catalog.products.map((product) => ({ id: product.id, providerId: product.providerId, name: product.name, category: product.category, imageUrl: product.imageUrl, expectedCommission: owner ? product.expectedCommission : null }))}
      initialCustomerId={initialCustomerId}
      initialLeadId={initialLeadId}
      initialProductId={initialProduct?.id}
      initialProviderId={initialProduct?.providerId}
      canUseCustomers={canUseCustomers}
      canUseLeads={canUseLeads}
      canCreateCustomer={canCreateCustomer}
      canEditCommission={owner}
    /></Card>
  </div>;
}
