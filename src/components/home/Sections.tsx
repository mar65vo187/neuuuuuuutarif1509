import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Phone, Quote } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { AdvisorAvatar } from "@/components/advisors/AdvisorCard";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";
import type { AudienceMode } from "@/lib/audience";
import { FAQ, FEATURED_SERVICES, OTHER_SERVICES, PROCESS, SERVICE_IMAGES, SITE, whatsappLink } from "@/lib/content";
import { getAdvisorBySlug } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Trust-Strip                                                        */
/* ------------------------------------------------------------------ */

export function TrustStrip() {
  const items = [
    { k: "Kostenlos", v: "Erstgespräch & Prüfung" },
    { k: "Ein Mensch", v: "fester Ansprechpartner" },
    { k: "Unabhängig", v: "viele Marktpartner, keine Bindung" },
    { k: "08–22 Uhr", v: "täglich erreichbar" },
  ];
  return (
    <section className="border-b border-line bg-paper">
      <Stagger className="container-x grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
        {items.map((it) => (
          <Item key={it.k} className="py-7 md:px-8 md:first:pl-0">
            <p className="text-[22px] font-extrabold tracking-tight text-ink">{it.k}</p>
            <p className="mt-0.5 text-[13.5px] text-steel">{it.v}</p>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Schwerpunkte                                                       */
/* ------------------------------------------------------------------ */

export function FocusSection() {
  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">Wo sich ein zweiter Blick besonders lohnt</p>
            <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.6rem)] font-extrabold leading-[1.02] text-ink">
              Große Entscheidungen, bei denen
              <br />
              <span className="display-i font-normal text-ink-700">niemand</span> allein entscheiden sollte.
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={0.1}>
            <p className="text-[16.5px] leading-relaxed text-steel">
              TarifWerk bringt Klarheit in komplexe Möglichkeiten – mit einem Menschen, der den Überblick behält.
            </p>
          </Reveal>
        </div>

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {FEATURED_SERVICES.map((s, i) => {
            const img = SERVICE_IMAGES[s.key];
            return (
              <Item key={s.key} className={i % 2 === 1 ? "lg:translate-y-10" : ""}>
                <Link
                  href={`/leistungen/${s.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-[26px] bg-ink text-white shadow-soft"
                >
                  {img && (
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover opacity-80 transition-transform duration-[1400ms] ease-premium group-hover:scale-[1.06]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                    <span className="chip border-white/15 bg-ink/40 text-platinum backdrop-blur">0{i + 1}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-ink/40 backdrop-blur transition-all duration-500 ease-premium group-hover:bg-electric group-hover:border-electric">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-electric-soft">{s.eyebrow}</p>
                    <h3 className="mt-2 text-[24px] font-extrabold leading-tight">{s.name}</h3>
                    <p className="mt-2 max-h-24 text-[14px] leading-snug text-silver opacity-100 transition-all duration-500 ease-premium lg:max-h-0 lg:opacity-0 lg:group-hover:max-h-24 lg:group-hover:opacity-100">
                      {s.short}
                    </p>
                  </div>
                </Link>
              </Item>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Alltag                                                             */
/* ------------------------------------------------------------------ */

export function EverydaySection() {
  return (
    <section className="bg-paper-2 py-20 sm:py-24">
      <div className="container-x">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-electric-deep">Und alles, was den Alltag betrifft</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">
              Alltagsthemen. Verständlich sortiert.
            </h2>
          </div>
          <p className="max-w-md text-[15.5px] text-steel">
            Ein Blick auf das Ganze. Und die richtige Unterstützung für jeden nächsten Schritt.
          </p>
        </Reveal>
        <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OTHER_SERVICES.map((s) => (
            <Item key={s.key}>
              <Link
                href={`/leistungen/${s.slug}`}
                className="card-hover group flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-6"
              >
                <div>
                  <h3 className="text-[18px] font-bold text-ink">{s.name}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-steel">{s.short}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-electric-deep">
                  Mehr erfahren <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Manifest                                                           */
/* ------------------------------------------------------------------ */

export function Manifesto() {
  const principles = [
    {
      t: "Persönlich statt Hotline",
      d: "Ein fester Ansprechpartner kennt die Ausgangslage – vor, während und nach der Entscheidung.",
    },
    {
      t: "Unabhängig statt gebunden",
      d: "Wir arbeiten mit vielen großen und kleineren Marktteilnehmern. Empfohlen wird, was zum tatsächlichen Bedarf passt.",
    },
    {
      t: "Ehrlich statt überredet",
      d: "Wenn etwas keinen Sinn ergibt, sagen wir das offen – auch ohne Abschluss.",
    },
  ];
  return (
    <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-20 grain">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-electric/12 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow justify-center text-electric-soft">Warum es TarifWerk gibt</p>
          <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.8rem)] font-extrabold leading-[1.04]">
            Beratung ist kein Verkauf mit{" "}
            <span className="display-i font-normal text-champagne-soft">freundlichem Gesicht.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-relaxed text-silver">
            Ein neuer Vertrag ist ein Anfang. Gute Beratung geht weiter: Zusammenhänge bleiben im Blick und bei neuen Fragen bleibt ein Ansprechpartner erreichbar.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-4 md:grid-cols-3" stagger={0.12}>
          {principles.map((p, i) => (
            <Item key={p.t}>
              <div className="glass card-hover h-full rounded-[24px] p-7">
                <span className="text-[13px] font-bold text-electric-soft">0{i + 1}</span>
                <h3 className="mt-4 text-[21px] font-bold leading-tight">{p.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-silver">{p.d}</p>
              </div>
            </Item>
          ))}
        </Stagger>

        <Reveal className="mt-10 rounded-[24px] border border-white/8 bg-white/[0.03] p-6 sm:p-8" delay={0.1}>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <p className="eyebrow text-platinum">Transparenz</p>
            <p className="text-[15.5px] leading-relaxed text-silver">
              <span className="font-semibold text-white">So verdienen wir:</span> Erstorientierung und Tarifcheck sind kostenfrei. Bei erfolgreicher Vermittlung erhalten wir eine Provision vom jeweiligen Anbieter. Die konkreten Vergütungsbedingungen erklären wir vor einer Entscheidung transparent.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Prozess                                                            */
/* ------------------------------------------------------------------ */

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
          {PROCESS.map((p) => (
            <Item key={p.step} className="relative">
              <span className="relative z-10 inline-grid h-9 w-9 place-items-center rounded-full border border-ink/10 bg-white text-[11px] font-extrabold text-ink shadow-sm">
                {p.step}
              </span>
              <h3 className="mt-4 text-[17px] font-bold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel">{p.text}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Gründer                                                            */
/* ------------------------------------------------------------------ */

export async function Founder() {
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
            <Button href="/berater/marvin-egenolf" iconRight={<ArrowRight />}>
              Marvin kennenlernen
            </Button>
            <Button href="/ueber-uns" variant="dark" magnetic={false}>
              Mehr über TarifWerk
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

export function FaqSection() {
  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow text-electric-deep">Häufige Fragen</p>
          <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)] font-extrabold leading-[1.05] text-ink">
            Was vor dem ersten Gespräch wichtig ist.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-steel">
            Nicht dabei? Einfach schreiben – die Antwort kommt persönlich.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={whatsappLink("Hallo TarifWerk, ich habe eine Frage:")} target="_blank" variant="dark" size="sm" icon={<MessageCircle />}>
              WhatsApp
            </Button>
            <Link href="/faq" className="inline-flex h-10 items-center text-[14px] font-semibold text-electric-deep hover:underline">
              Alle Fragen →
            </Link>
          </div>
        </Reveal>
        <Reveal className="lg:col-span-8" delay={0.1}>
          <Accordion items={FAQ.slice(0, 5)} />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

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
            <Link href={`/berater?audience=${audience}`} className="card-hover flex h-full flex-col rounded-2xl bg-electric p-6 text-white">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80">Erster Schritt</span>
              <span className="mt-3 text-[19px] font-bold">Ansprechpartner finden</span>
              <span className="mt-1 text-[13.5px] text-white/85">{business ? "Bedarf klären und nächsten Schritt bündeln" : "Thema wählen und Klarheit bekommen"}</span>
              <ArrowRight className="mt-6 h-5 w-5" />
            </Link>
          </Item>
          <Item>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="glass card-hover flex h-full flex-col rounded-2xl p-6">
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
