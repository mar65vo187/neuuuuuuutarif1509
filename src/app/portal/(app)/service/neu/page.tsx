import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
import { redirect } from "next/navigation";
import { Card } from "@/components/portal/ui";
import { ServiceCaseCreateForm } from "@/components/portal/ServiceCaseCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { listServiceAssignableEmployees, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { listServiceCaseCustomerOptions, listServiceCaseOrderOptions } from "@/lib/service-cases";

export const dynamic = "force-dynamic";

export default async function NewServiceCasePage({ searchParams }: { searchParams: Promise<{ customer?: string; order?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fservice%2Fneu");
  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.SERVICE_EDIT, PORTAL_PERMISSION.SERVICE_ASSIGN] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.SERVICE_EDIT] || user.role === "admin";
  const canAssign = capabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin";
  if (!canEdit) redirect("/portal/service");

  const params = await searchParams;
  const initialCustomerId = params.customer && /^\d+$/.test(params.customer) ? Number(params.customer) : undefined;
  const initialOrderId = params.order && /^\d+$/.test(params.order) ? Number(params.order) : undefined;
  const [customers, orders, assignees] = await Promise.all([
    listServiceCaseCustomerOptions(user, canAssign, 500),
    listServiceCaseOrderOptions(user, canAssign, 700),
    canAssign ? listServiceAssignableEmployees() : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/portal/service" className="inline-flex items-center gap-2 text-[13px] font-bold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Service</Link>
    <header>
      <p className="eyebrow text-electric-deep">Service Operations</p>
      <div className="mt-2 flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-electric-soft"><Headphones className="h-5 w-5" /></span><div><h1 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold tracking-tight">Servicefall anlegen</h1><p className="mt-1 max-w-2xl text-[13px] text-steel">Ein sauberer Fall bündelt Zuständigkeit, SLA, Historie und Folgeaufgabe – ohne den Vertriebsstatus des Kunden oder Auftrags zu verfälschen.</p></div></div>
    </header>
    <Card>
      <ServiceCaseCreateForm customers={customers} orders={orders} assignees={assignees} canAssign={canAssign} initialCustomerId={initialCustomerId} initialOrderId={initialOrderId} currentUserId={user.id} />
    </Card>
  </div>;
}
