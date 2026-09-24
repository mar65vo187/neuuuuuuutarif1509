import { redirect } from "next/navigation";
import { OptimizationHubDashboard } from "@/components/portal/OptimizationHubDashboard";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { getOptimizationHubData } from "@/lib/optimization-hub";

export const dynamic = "force-dynamic";

export default async function OptimizationHubPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Foptimierung");

  const [canRead, canEdit] = await Promise.all([
    hasPermission(user, PORTAL_PERMISSION.CUSTOMER_READ),
    hasPermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT),
  ]);
  if (user.role !== "admin" && !canRead && !canEdit) redirect("/portal");

  const data = await getOptimizationHubData(user);
  const requestedCustomerId = Number((await searchParams).customer);
  const initialCustomerId = Number.isSafeInteger(requestedCustomerId) && data.customers.some((customer) => customer.id === requestedCustomerId) ? requestedCustomerId : undefined;
  return <OptimizationHubDashboard data={data} canEdit={user.role === "admin" || canEdit} initialCustomerId={initialCustomerId} />;
}
