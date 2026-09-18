import Link from "next/link";
import { ArrowRight, BadgeEuro, CheckCircle2, Gift, Share2 } from "lucide-react";
import { REFERRAL_MAX_VOUCHER, REFERRAL_PIPELINE, REFERRAL_REWARD_GROUPS, formatEuro } from "@/lib/referral-rewards";

export function ReferralRewardMatrix() {
  return (
    <section id="praemien" className="bg-paper-2 py-16 sm:py-20">
      <div className="container-x">
        <div className="max-w-3xl">
          <p className="eyebrow text-electric-deep">Prämien</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-tight text-ink">
            Bis zu {formatEuro(REFERRAL_MAX_VOUCHER)} Wunschgutschein pro erfolgreicher Empfehlung.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-steel">
            Die veröffentlichten Beträge sind Maximalwerte je Bereich. Die konkrete Prämie wird nach erfolgreicher Vermittlung und Prüfung der jeweiligen Voraussetzungen bestätigt.
            Alternativ kannst du statt des Wunschgutscheins eine Geld-Auszahlung in Höhe von 50 % des bestätigten Gutscheinwerts wählen.
          </p>
        </div>

        <div className="mt-10 space-y-5">
          {REFERRAL_REWARD_GROUPS.map((group) => (
            <div key={group.group} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[18px] font-extrabold text-ink">{group.group}</h3>
                <span className="chip border-electric/20 bg-electric/5 text-electric-deep">bis zu {formatEuro(group.maxVoucherAmount)}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.rules.map((rule) => (
                  <div key={rule.key} className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-ink">{rule.label}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-steel">
                          {rule.note ?? "Wunschgutschein bei erfolgreicher Vermittlung"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-steel">bis zu</span>
                        <span className="text-[23px] font-extrabold text-ink">{formatEuro(rule.maxVoucherAmount)}</span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-line pt-3 text-[12.5px] text-steel">
                      Alternative Geld-Auszahlung: bis zu {formatEuro(rule.maxCashAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-steel">
          <strong className="text-ink">Transparent & fair:</strong> Die Prämie gilt pro erfolgreich vermittelter Person. Mehrere Empfehlungen sind erlaubt.
          Ein Anspruch auf den jeweiligen Maximalbetrag entsteht nicht automatisch; maßgeblich sind Produkt, vermitteltes Geschäft, geltende Voraussetzungen und die individuelle Freigabe.
          Die Freigabe erfolgt erst nach Prüfung relevanter Widerrufs- und Stornofristen.
        </div>
      </div>
    </section>
  );
}

export function ReferralPipeline() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-electric-deep">So bleibt alles nachvollziehbar</p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">Vom Link bis zur Prämie.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-steel">
              Dein privater Status zeigt nur zusammengefasste Informationen und Prämienstatus – keine Namen, Vertragsdetails oder Kontaktdaten deiner Empfehlungen.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            {REFERRAL_PIPELINE.map((step, index) => (
              <li key={step.key} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="font-bold text-ink">{step.label}</h3>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-steel">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function ReferralHomeTeaser() {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-x grid gap-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <p className="eyebrow text-electric-soft"><Gift className="h-4 w-4" /> Freunde werben</p>
          <h2 className="mt-4 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-[1.04]">
            Gute Erfahrungen weitergeben. <span className="display-i font-normal text-champagne-soft">Wir bedanken uns dafür.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-silver">
            Wenn du TarifWerk guten Gewissens weiterempfehlen möchtest, bekommst du einen persönlichen Link und einen transparenten Status. Entsteht daraus eine erfolgreiche Vermittlung, erhältst du je nach Bereich einen bestätigten Wunschgutschein von bis zu {formatEuro(REFERRAL_MAX_VOUCHER)} – oder alternativ 50 % des Gutscheinwerts als Geld-Auszahlung.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-silver">
            <span className="inline-flex items-center gap-2"><Share2 className="h-4 w-4 text-electric-soft" /> Persönlicher Link</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-electric-soft" /> Transparenter Status</span>
            <span className="inline-flex items-center gap-2"><BadgeEuro className="h-4 w-4 text-electric-soft" /> Prämie erst nach erfolgreicher Vermittlung</span>
          </div>
        </div>
        <div className="lg:col-span-5 lg:text-right">
          <Link href="/freund-werben" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-electric px-6 py-3 text-[14px] font-semibold text-white hover:bg-electric-deep">
            Empfehlungsprogramm öffnen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
