import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { ReferralAdminActions } from "@/components/portal/ReferralAdminActions";
import { getCurrentUser } from "@/lib/auth";
import { listReferralRewardsForAdmin } from "@/lib/referral-reward-engine";
import { REFERRAL_REWARD_RULES } from "@/lib/referral-rewards";

export const dynamic = "force-dynamic";

const euro = (cents: number | null) => ((cents ?? 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function ReferralAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fempfehlungen");
  if (user.role !== "admin") redirect("/portal");

  const rows = await listReferralRewardsForAdmin(300);

  return <div className="space-y-6">
    <header>
      <p className="eyebrow text-electric-deep">Empfehlungssteuerung</p>
      <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Empfehlungen & Prämien</h1>
      <p className="mt-1 text-[14px] text-steel">Prämien erst nach Prüfung freigeben. Veröffentlichte Maximalwerte können technisch nicht überschritten werden.</p>
    </header>

    <Card className="p-0 sm:p-0">
      {rows.length === 0 ? <div className="p-10 text-center"><Gift className="mx-auto h-6 w-6 text-steel" /><p className="mt-3 text-[14px] text-steel">Noch keine provisionsrelevanten Empfehlungen.</p></div> :
      <ul className="divide-y divide-line">{rows.map(({ reward, leadId, referrerName, referrerEmail }) => {
        const rule = REFERRAL_REWARD_RULES.find((item) => item.key === reward.ruleKey);
        return <li key={reward.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-ink">{rule?.label ?? reward.ruleKey}</p>
              <span className="chip border-line bg-white">{reward.status}</span>
              <span className="text-[12px] text-steel">max. {euro(reward.maxVoucherAmountCents)}</span>
            </div>
            <p className="mt-1 text-[13px] text-steel">Empfehler: {referrerName} · {referrerEmail}</p>
            <p className="mt-1 text-[12px] text-steel">Lead #{leadId} · Reward #{reward.id} · {formatDate(reward.createdAt)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[12.5px]">
              <Link href={`/portal/leads/${leadId}`} className="font-semibold text-electric-deep hover:underline">Lead öffnen</Link>
              {reward.orderId && <Link href={`/portal/auftraege/${reward.orderId}`} className="font-semibold text-electric-deep hover:underline">Auftrag öffnen</Link>}
            </div>
            {reward.voucherAmountCents !== null && <p className="mt-3 text-[13px] text-ink">Bestätigt: <strong>{euro(reward.voucherAmountCents)}</strong> Gutschein · Geldalternative {euro(reward.cashAmountCents)}</p>}
          </div>
          <ReferralAdminActions
            id={reward.id}
            status={reward.status}
            maxVoucherAmountCents={reward.maxVoucherAmountCents}
            voucherAmountCents={reward.voucherAmountCents}
            payoutChoice={reward.payoutChoice}
          />
        </li>;
      })}</ul>}
    </Card>
  </div>;
}
