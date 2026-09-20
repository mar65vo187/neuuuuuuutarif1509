import { redirect } from "next/navigation";
import { CampaignCockpit } from "@/components/portal/CampaignCockpit";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { MARKETING_CAMPAIGNS } from "@/lib/marketing-campaigns";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fkampagnen");
  if (!await hasPermission(user, PORTAL_PERMISSION.REPORT_SALES)) redirect("/portal");

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Marketing & Attribution</p>
        <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Kampagnen-Cockpit</h1>
        <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-steel">Landingpages, kanalgenaue Tracking-Links und Anzeigen-Grundlagen an einem Ort. Kampagnen bleiben transparent bis zum Lead- und Abschlussstatus im CRM messbar.</p>
      </header>
      <CampaignCockpit campaigns={MARKETING_CAMPAIGNS} />
    </div>
  );
}
