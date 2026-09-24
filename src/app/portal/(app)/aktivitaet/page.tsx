import { redirect } from "next/navigation";
import { EmployeeActivityDashboard } from "@/components/portal/EmployeeActivityDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeActivityDashboard } from "@/lib/employee-activity";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mitarbeiter-Aktivität", robots: { index: false, follow: false } };

export default async function EmployeeActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faktivitaet");
  if (user.role !== "admin") redirect("/portal");

  const data = await getEmployeeActivityDashboard(user);
  return <EmployeeActivityDashboard
    currentAdminId={user.id}
    stats={data.stats}
    employees={data.employees.map((employee) => ({
      ...employee,
      lastSeenAt: employee.lastSeenAt?.toISOString() ?? null,
      lastLoginAt: employee.lastLoginAt?.toISOString() ?? null,
      lastActionAt: employee.lastActionAt?.toISOString() ?? null,
      lastNudgeAt: employee.lastNudgeAt?.toISOString() ?? null,
      lastNudgeAckAt: employee.lastNudgeAckAt?.toISOString() ?? null,
    }))}
  />;
}
