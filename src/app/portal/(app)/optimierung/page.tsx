import { redirect } from "next/navigation";
import { OptimizationHub } from "@/components/portal/OptimizationHub";
import { getCurrentUser } from "@/lib/auth";
import { getOptimizationHubData, OPTIMIZATION_STATUS_LABELS, OPTIMIZATION_TYPE_LABELS } from "@/lib/optimization";

export const dynamic = "force-dynamic";

export default async function OptimizationHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=/portal/optimierung");
  const data = await getOptimizationHubData(user);

  return (
    <OptimizationHub
      stats={data.stats}
      subscriptions={data.subscriptions.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
        next_review_at: item.next_review_at?.toISOString() ?? null,
      }))}
      requests={data.requests.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      }))}
      documents={data.documents.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
      }))}
      employees={data.employees}
      providers={data.providers}
      isAdmin={data.isAdmin}
      typeLabels={OPTIMIZATION_TYPE_LABELS}
      statusLabels={OPTIMIZATION_STATUS_LABELS}
    />
  );
}
