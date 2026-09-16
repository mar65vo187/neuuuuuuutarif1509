import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAdminAccounts } from "@/lib/admin-server";
import { UserManagement } from "@/components/portal/UserManagement";
import type { AdminAccount } from "@/lib/admin-validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Benutzer & Berater verwalten", robots: { index: false, follow: false } };

export default async function AdministrationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=/portal/verwaltung");
  if (user.role !== "admin") redirect("/portal");
  let accounts: AdminAccount[] = [];
  let loadError: string | null = null;
  try {
    const rows = await listAdminAccounts();
    accounts = rows.map((row) => ({ ...row, advisor: row.advisor ? {
      ...row.advisor, quote: row.advisor.quote ?? "", phone: row.advisor.phone ?? "",
      whatsapp: row.advisor.whatsapp ?? "", email: row.advisor.email ?? "",
    } : null }));
  } catch { loadError = "Die Benutzer konnten gerade nicht geladen werden. Bitte erneut versuchen."; }
  return <UserManagement currentUserId={user.id} initialAccounts={accounts} initialError={loadError} />;
}
