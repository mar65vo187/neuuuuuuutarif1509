import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAdminAccounts } from "@/lib/admin-server";
import { listEnterpriseRoleState } from "@/lib/enterprise-access";
import { UserManagement } from "@/components/portal/UserManagement";
import { EnterpriseRoleManager } from "@/components/portal/EnterpriseRoleManager";
import { AdvisorLicenseManager } from "@/components/portal/AdvisorLicenseManager";
import { listAdminLicenses } from "@/lib/advisor-licenses-server";
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
  let licenses: Awaited<ReturnType<typeof listAdminLicenses>> = [];
  try {
    const [rows, roles, licenseRows] = await Promise.all([listAdminAccounts(), listEnterpriseRoleState(), listAdminLicenses()]);
    roleState = roles;
    licenses = licenseRows;
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
    <AdvisorLicenseManager
      advisors={accounts.flatMap((account) => account.advisor ? [{ id: account.advisor.id, name: account.advisor.name }] : [])}
      licenses={licenses.map((row) => ({
        id: row.id,
        advisorId: row.advisorId,
        kind: row.kind,
        status: row.status,
        holderName: row.holderName,
        businessAddress: row.businessAddress,
        registerNumber: row.registerNumber,
        authority: row.authority,
      }))}
    />
    <EnterpriseRoleManager
      employees={accounts.map((account) => ({ id: account.id, name: account.name, email: account.email, role: account.role, active: account.active }))}
      roles={roleState.roles}
      initialAssignments={roleState.assignments}
    />
  </div>;
}
