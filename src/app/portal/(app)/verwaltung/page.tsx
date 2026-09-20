import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAdminAccounts, listEnterpriseRoleState } from "@/lib/admin-server";
import { UserManagement } from "@/components/portal/UserManagement";
import { EnterpriseRoleManager } from "@/components/portal/EnterpriseRoleManager";
import type { AdminAccount } from "@/lib/admin-validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Benutzer & Berater verwalten", robots: { index: false, follow: false } };

export default async function AdministrationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=/portal/verwaltung");
  if (user.role !== "admin") redirect("/portal");
  let accounts: AdminAccount[] = [];
  let roleState: Awaited<ReturnType<typeof listEnterpriseRoleState>> = { roles: [], assignments: [] };
  let loadError: string | null = null;
  try {
    const [rows, roles] = await Promise.all([listAdminAccounts(), listEnterpriseRoleState()]);
    roleState = roles;
    accounts = rows.map((row) => ({
      ...row,
      address: row.address ?? "",
      note: row.note ?? "",
      advisoryAreas: row.advisoryAreas ?? [],
      advisor: row.advisor ? {
      ...row.advisor, quote: row.advisor.quote ?? "", phone: row.advisor.phone ?? "",
      whatsapp: row.advisor.whatsapp ?? "", email: row.advisor.email ?? "",
      } : null,
    }));
  } catch { loadError = "Die Benutzer konnten gerade nicht geladen werden. Bitte erneut versuchen."; }
  return <div className="space-y-6">
    <UserManagement currentUserId={user.id} initialAccounts={accounts} initialError={loadError} />
    <EnterpriseRoleManager
      employees={accounts.map((account) => ({ id: account.id, name: account.name, email: account.email, role: account.role, active: account.active }))}
      roles={roleState.roles}
      initialAssignments={roleState.assignments}
    />
  </div>;
}
