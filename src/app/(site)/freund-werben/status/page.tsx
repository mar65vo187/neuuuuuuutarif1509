import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { ReferralDashboard } from "@/components/referrals/ReferralPanel";

export const metadata = { ...pageMetadata("/freund-werben/status"), referrer: "no-referrer" as const };

export default function ReferralStatusPage() {
  return <>
    <PageHero
      eyebrow="Ihr privater Status"
      title={<>Empfehlungen & Prämien. <span className="display-i font-normal text-champagne-soft">Transparent im Blick.</span></>}
      text="Hier sehen Sie anonymisiert, wie sich Ihre Empfehlungen entwickeln und welche Prämien bereits abgeschlossen, freigegeben oder erledigt sind."
      compact
    />
    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <div className="mx-auto max-w-5xl rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
          <ReferralDashboard />
        </div>
      </div>
    </section>
  </>;
}
