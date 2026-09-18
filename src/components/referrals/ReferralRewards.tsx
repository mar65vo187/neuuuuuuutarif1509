import Link from "next/link";
import { ArrowRight, BadgeEuro, CheckCircle2, Gift, Share2 } from "lucide-react";
import { REFERRAL_MAX_VOUCHER, REFERRAL_PIPELINE, REFERRAL_REWARD_GROUPS, formatEuro } from "@/lib/referral-rewards";

export function ReferralRewardMatrix() {
  return (
    <section id="praemien" className="section-compact bg-paper-2">
      <div className="container-x">
        <div className="max-w-3xl">
          <p className="eyebrow text-electric-deep">Prämienübersicht</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-tight text-ink">Transparent sehen, was je Bereich möglich ist.</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-steel">Bis zu {formatEuro(REFERRAL_MAX_VOUCHER)} Wunschgutschein sind im aktuell veröffentlichten Prämienmodell je nach Bereich möglich. Die konkreten Voraussetzungen und der bestätigte Betrag werden vor der Freigabe geprüft.</p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-[24px] border border-line bg-white shadow-sm">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">Prämienmatrix des TarifWerk Empfehlungsprogramms</caption>
            <thead className="bg-paper text-[11px] uppercase tracking-[0.14em] text-steel">
              <tr><th scope="col" className="px-5 py-4 font-semibold">Bereich</th><th scope="col" className="px-5 py-4 font-semibold">Leistung</th><th scope="col" className="px-5 py-4 text-right font-semibold">Max. Gutschein</th><th scope="col" className="px-5 py-4 text-right font-semibold">Alternative Auszahlung</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {REFERRAL_REWARD_GROUPS.flatMap((group) => group.rules.map((rule) => <tr key={rule.key} className="align-top"><td className="px-5 py-4 text-[13px] font-semibold text-electric-deep">{group.group}</td><td className="px-5 py-4"><span className="font-bold text-ink">{rule.label}</span><span className="mt-1 block text-[12.5px] leading-relaxed text-steel">{rule.note ?? "Nach erfolgreicher Vermittlung und Prüfung"}</span></td><td className="px-5 py-4 text-right text-[18px] font-extrabold text-ink">bis {formatEuro(rule.maxVoucherAmount)}</td><td className="px-5 py-4 text-right text-[13px] text-steel">bis {formatEuro(rule.maxCashAmount)}</td></tr>))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-steel"><strong className="text-ink">Wichtig:</strong> Maximalwerte sind keine automatische Anspruchszusage. Maßgeblich sind das vermittelte Geschäft, die geltenden Bedingungen sowie die Prüfung von Widerrufs- und Stornofristen.</div>
      </div>
    </section>
  );
}

export function ReferralPipeline() {
  return <section className="section-compact bg-white"><div className="container-x"><div className="grid gap-8 lg:grid-cols-12"><div className="lg:col-span-4"><p className="eyebrow text-electric-deep">So funktioniert es</p><h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">Drei einfache Schritte bis zur Empfehlung.</h2><p className="mt-4 text-[15px] leading-relaxed text-steel">Die technische Statusanzeige kann zusätzliche Prüfphasen enthalten. Namen, Vertragsdetails und Kontaktdaten der empfohlenen Personen werden im privaten Status nicht angezeigt.</p></div><ol className="grid gap-3 sm:grid-cols-2 lg:col-span-8">{REFERRAL_PIPELINE.slice(0, 3).map((step, index) => <li key={step.key} className="rounded-2xl border border-line bg-paper p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span><h3 className="font-bold text-ink">{index === 0 ? "Link erstellen" : index === 1 ? "Weiterempfehlen" : "Status verfolgen"}</h3></div><p className="mt-3 text-[13.5px] leading-relaxed text-steel">{index === 0 ? "Du erhältst einen persönlichen Empfehlungslink und kannst ihn direkt teilen." : index === 1 ? "Die empfohlene Person entscheidet selbst, ob sie Kontakt zu TarifWerk aufnehmen möchte." : "Du siehst den anonymisierten Stand deiner Empfehlung und die nächsten Prüfphasen."}</p></li>)}</ol></div></div></section>;
}

export function ReferralHomeTeaser() {
  return <section className="bg-ink py-10 text-white sm:py-12"><div className="container-x grid gap-6 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-7"><p className="eyebrow text-electric-soft"><Gift className="h-4 w-4" /> Freunde werben</p><h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.7rem)] font-extrabold leading-[1.04]">Gute Beratung weiterempfehlen. <span className="display-i font-normal text-champagne-soft">Transparent belohnt werden.</span></h2><p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-silver">Persönlichen Link teilen, Status verfolgen und bei erfolgreicher Vermittlung je nach Bereich bis zu {formatEuro(REFERRAL_MAX_VOUCHER)} Wunschgutschein erhalten. Die Bedingungen und Maximalwerte stehen offen in der Prämienmatrix.</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-silver"><span className="inline-flex items-center gap-2"><Share2 className="h-4 w-4 text-electric-soft" /> Persönlicher Link</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-electric-soft" /> Anonymisierter Status</span><span className="inline-flex items-center gap-2"><BadgeEuro className="h-4 w-4 text-electric-soft" /> Prüfung vor Freigabe</span></div></div><div className="lg:col-span-5 lg:text-right"><Link href="/freund-werben" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-electric px-6 py-3 text-[14px] font-semibold text-white hover:bg-electric-deep">Empfehlungslink erstellen <ArrowRight className="h-4 w-4" /></Link></div></div></section>;
}
