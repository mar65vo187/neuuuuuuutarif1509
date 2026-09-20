import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { CustomerCreateForm } from "@/components/portal/CustomerCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/enterprise";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkunden%2Fneu");
  if (!await hasPermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT)) redirect("/portal/kunden");
  const existingCustomers = await listCustomers(user, undefined, 200);
  const referrerOptions = existingCustomers.map((customer) => ({
    id: customer.id,
    customerNumber: customer.customerNumber,
    label: customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.customerNumber,
  }));
  return <div className="space-y-6">
    <Link href="/portal/kunden" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
    <header><p className="eyebrow text-electric-deep">CRM · Kundenreise</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Kundenakte anlegen</h1><p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-steel">Kundendaten und Herkunft einmal sauber erfassen. Danach steuerst du Auftrag, Folgepotenzial und Empfehlungen direkt aus der Kundenakte.</p></header>
    <Card><CustomerCreateForm referrerOptions={referrerOptions} /></Card>
  </div>;
}
