import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OptimizationCustomerApp } from "@/components/optimization/OptimizationCustomerApp";
import { getOptimizationCustomerApp, OPTIMIZATION_STATUS_LABELS, OPTIMIZATION_TYPE_LABELS } from "@/lib/optimization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mein TarifWerk · Optimierung+",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function MyTarifwerkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const data = await getOptimizationCustomerApp(token).catch(() => null);
  if (!data) notFound();

  return (
    <OptimizationCustomerApp
      token={token}
      subscription={{
        id: data.subscription.id,
        customer_name: data.subscription.customer_name,
        email: data.subscription.email,
        status: data.subscription.status,
        billing_status: data.subscription.billing_status,
        price_cents: data.subscription.price_cents,
        next_review_at: data.subscription.next_review_at?.toISOString() ?? null,
        started_at: data.subscription.started_at?.toISOString() ?? null,
      }}
      requests={data.requests.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      }))}
      documents={data.documents.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
      }))}
      typeLabels={OPTIMIZATION_TYPE_LABELS}
      statusLabels={OPTIMIZATION_STATUS_LABELS}
    />
  );
}
