import { redirect } from "next/navigation";
import { ContactPool } from "@/components/portal/ContactPool";
import { getCurrentUser } from "@/lib/auth";
import { listContactPool } from "@/lib/contact-pool";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kontaktpool", robots: { index: false, follow: false } };

export default async function ContactPoolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkontakte");
  if (!await hasPermission(user, PORTAL_PERMISSION.LEAD_EDIT)) redirect("/portal");
  const rows = await listContactPool(user);
  return <ContactPool rows={rows.map((row) => ({
    ...row,
    next_contact_at: row.next_contact_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }))} />;
}
