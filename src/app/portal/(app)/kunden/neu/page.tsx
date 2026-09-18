import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { CustomerCreateForm } from "@/components/portal/CustomerCreateForm";
import { getCurrentUser } from "@/lib/auth";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkunden%2Fneu");
  return <div className="space-y-6">
    <Link href="/portal/kunden" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
    <header><p className="eyebrow text-electric-deep">CRM</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Kundenakte anlegen</h1></header>
    <Card><CustomerCreateForm /></Card>
  </div>;
}
