import { ArrowRight } from "lucide-react";
import { AdvisorAvatar } from "@/components/advisors/AdvisorCard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { SITE } from "@/lib/content";
import { getAdvisorBySlug } from "@/lib/queries";

export async function Founder({ audience = "b2c" }: { audience?: AudienceMode }) {
  let founderImageUrl: string | null = null;
  let founderInitials = "ME";
  try {
    const founder = await getAdvisorBySlug("marvin-egenolf");
    founderImageUrl = founder?.imageUrl ?? null;
    founderInitials = founder?.initials || founderInitials;
  } catch {
    // Homepage remains available if advisor storage is temporarily unavailable.
  }

  return (
    <section className="bg-paper-2 py-16 sm:py-20">
      <div className="container-x grid gap-8 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-[26px] bg-ink p-6 text-white shadow-soft sm:p-7">
            <div className="absolute inset-0 grid-lines opacity-60" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-electric/25 blur-[80px]" />
            <div className="relative">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <AdvisorAvatar
                  initials={founderInitials}
                  imageUrl={founderImageUrl}
                  name={SITE.founder}
                  size="xl"
                  className="ring-white/20"
                />
                <div>
                  <p className="text-[19px] font-bold">{SITE.founder}</p>
                  <p className="mt-1 text-[12.5px] text-silver">{SITE.founderTitle} · {SITE.hq}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-silver">Persönlicher Ansprechpartner hinter TarifWerk – nicht nur ein Name im Impressum.</p>
                </div>
              </div>
              <blockquote className="mt-8 text-[clamp(1.45rem,2.8vw,2.15rem)] font-bold leading-[1.08]">
                „Erst verstehen, was wirklich gebraucht wird. Dann eine Empfehlung geben.“
              </blockquote>
              <div className="mt-8 grid grid-cols-2 gap-3 text-[12.5px] text-silver">
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <p className="font-semibold text-white">Persönlich</p>
                  <p className="mt-1">direkter Ansprechpartner</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <p className="font-semibold text-white">Deutschlandweit</p>
                  <p className="mt-1">digital & nach Absprache vor Ort</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="lg:col-span-7">
          <Reveal>
            <p className="eyebrow text-electric-deep">Der Mensch hinter TarifWerk</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-[1.04] text-ink">
              Beratung soll sich nicht wie ein Verkaufsgespräch anfühlen.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-5 max-w-2xl space-y-4 text-[15.5px] leading-relaxed text-steel">
              <p>
                Marvin Noel Egenolf hat TarifWerk aufgebaut, um mehrere Vertrags-, Versorgungs- und Entscheidungsthemen
                an einem Ort zusammenzubringen. So beginnt nicht jedes neue Thema wieder bei null.
              </p>
              <p>
                Der Anspruch ist einfach: zuhören, sauber erklären, eine klare Empfehlung geben und auch nach der
                Entscheidung erreichbar bleiben.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="mt-6 flex flex-wrap gap-3">
            <Button href={withAudience("/berater/marvin-egenolf", audience)} iconRight={<ArrowRight />}>
              Marvin kennenlernen
            </Button>
            <Button href={withAudience("/ueber-uns", audience)} variant="dark" magnetic={false}>
              Mehr über TarifWerk
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
