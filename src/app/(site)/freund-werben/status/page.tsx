import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { ReferralDashboard } from "@/components/referrals/ReferralPanel";
export const metadata = { ...pageMetadata("/freund-werben/status"), referrer: "no-referrer" as const };
export default function ReferralStatusPage() {
  return <><PageHero eyebrow="Dein privater Status" title={<>Weiterempfohlen. <span className="display-i font-normal text-champagne-soft">Im Blick behalten.</span></>} text="Hier siehst du die zusammengefasste Entwicklung deiner Empfehlungen." compact /><section className="bg-paper py-16 sm:py-20"><div className="container-x"><div className="mx-auto max-w-4xl rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9"><ReferralDashboard /></div></div></section></>;
}
