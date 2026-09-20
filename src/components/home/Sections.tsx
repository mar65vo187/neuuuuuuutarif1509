import { ArrowRight, MessageCircle, Phone, Quote } from "lucide-react";
import Link from "next/link";
import { AdvisorAvatar } from "@/components/advisors/AdvisorCard";
import { Button } from "@/components/ui/Button";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { PROCESS, SITE, whatsappLink } from "@/lib/content";
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

export function Process() {
  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="container-x">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-electric-deep">So entsteht eine Entscheidung</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.9rem)] font-extrabold leading-[1.04] text-ink">
            Vier Schritte. Mehr braucht es für den Anfang nicht.
          </h2>
        </Reveal>
        <Stagger className="relative mt-9 grid gap-4 md:grid-cols-4" stagger={0.12}>
          <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent md:block" />
          {PROCESS.map((item) => (
            <Item key={item.step} className="relative">
              <span className="relative z-10 inline-grid h-9 w-9 place-items-center rounded-full border border-ink/10 bg-white text-[11px] font-extrabold text-ink shadow-sm">
                {item.step}
              </span>
              <h3 className="mt-4 text-[17px] font-bold text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel">{item.text}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function FinalCta({ audience = "b2c" }: { audience?: AudienceMode }) {
  const business = audience === "b2b";
  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32 grain">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-champagne" />
          <h2 className="mt-4 text-[clamp(2.1rem,5vw,4rem)] font-extrabold leading-[1.0]">
            {business ? "Schildern Sie uns kurz die Ausgangslage." : "Sag uns, worum es geht."}
            <br />
            <span className="display-i font-normal text-platinum">{business ? "Wir bringen Struktur rein." : "Wir bringen Klarheit rein."}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-silver">
            {business ? "Ein kurzes Gespräch reicht, um Bedarf, Prioritäten und sinnvolle nächste Schritte zu strukturieren." : "Ein kurzes Gespräch reicht, um herauszufinden, was sich für dich lohnt und welcher nächste Schritt sinnvoll ist."}
          </p>
        </Reveal>
        <Stagger className="mx-auto mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
          <Item>
            <Link href={withAudience("/berater", audience)} className="card-hover flex h-full flex-col rounded-2xl bg-electric p-6 text-white">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80">Erster Schritt</span>
              <span className="mt-3 text-[19px] font-bold">Ansprechpartner finden</span>
              <span className="mt-1 text-[13.5px] text-white/85">{business ? "Bedarf klären und nächsten Schritt bündeln" : "Thema wählen und Klarheit bekommen"}</span>
              <ArrowRight className="mt-6 h-5 w-5" />
            </Link>
          </Item>
          <Item>
            <a href={whatsappLink(business ? "Hallo TarifWerk, ich möchte eine Business-Anfrage stellen." : undefined)} target="_blank" rel="noopener noreferrer" className="glass card-hover flex h-full flex-col rounded-2xl p-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-silver">Schnell</span>
              <span className="mt-3 text-[19px] font-bold">WhatsApp</span>
              <span className="mt-1 text-[13.5px] text-silver">{SITE.whatsappDisplay}</span>
              <MessageCircle className="mt-6 h-5 w-5 text-[#25D366]" />
            </a>
          </Item>
          <Item>
            <a href={SITE.phoneHref} className="glass card-hover flex h-full flex-col rounded-2xl p-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-silver">Direkt</span>
              <span className="mt-3 text-[19px] font-bold">Anrufen</span>
              <span className="mt-1 text-[13.5px] text-silver">{SITE.hours}</span>
              <Phone className="mt-6 h-5 w-5 text-electric-soft" />
            </a>
          </Item>
        </Stagger>
      </div>
    </section>
  );
}

