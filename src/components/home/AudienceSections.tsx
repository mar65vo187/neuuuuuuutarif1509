"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Phone, Quote, ShieldCheck } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";
import { useAudience } from "@/components/home/AudienceProvider";
import { AUDIENCE_COPY, SERVICE_AUDIENCE_COPY } from "@/lib/audience-copy";
import { FEATURED_SERVICES, OTHER_SERVICES, SERVICE_IMAGES, SITE, whatsappLink } from "@/lib/content";

export function AudienceTrustStrip() {
  const { audience } = useAudience();
  const items = AUDIENCE_COPY[audience].trust;
  return (
    <section className="border-b border-line bg-paper">
      <Stagger className="container-x grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
        {items.map((item) => (
          <Item key={item.k} className="min-h-[104px] py-7 md:px-8 md:first:pl-0">
            <p className="text-[22px] font-extrabold tracking-tight text-ink">{item.k}</p>
            <p className="mt-0.5 text-[13.5px] text-steel">{item.v}</p>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

export function AudienceFocusSection() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].focus;
  const serviceCopy = SERVICE_AUDIENCE_COPY[audience];

  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
            <h2 className="mt-4 min-h-[2.15em] text-[clamp(2rem,4.4vw,3.6rem)] font-extrabold leading-[1.02] text-ink">
              {copy.titleA}
              <br />
              <span className="display-i font-normal text-ink-700">{copy.titleEm}</span> {copy.titleB}
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={0.1}>
            <p className="min-h-[4.8rem] text-[16.5px] leading-relaxed text-steel">{copy.text}</p>
          </Reveal>
        </div>

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {FEATURED_SERVICES.map((service, index) => {
            const image = SERVICE_IMAGES[service.key];
            return (
              <Item key={service.key} className={index % 2 === 1 ? "lg:translate-y-10" : ""}>
                <Link href={`/leistungen/${service.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[26px] bg-ink text-white shadow-soft">
                  {image && (
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover opacity-80 transition-transform duration-[1400ms] ease-premium group-hover:scale-[1.06]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                    <span className="chip border-white/15 bg-ink/40 text-platinum backdrop-blur">0{index + 1}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-ink/40 backdrop-blur transition-all duration-500 ease-premium group-hover:border-electric group-hover:bg-electric">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-electric-soft">{service.eyebrow}</p>
                    <h3 className="mt-2 text-[24px] font-extrabold leading-tight">{service.name}</h3>
                    <p className="mt-2 max-h-28 text-[14px] leading-snug text-silver opacity-100 transition-all duration-500 ease-premium lg:max-h-0 lg:opacity-0 lg:group-hover:max-h-28 lg:group-hover:opacity-100">
                      {serviceCopy[service.key] ?? service.short}
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

export function AudienceEverydaySection() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].everyday;
  const serviceCopy = SERVICE_AUDIENCE_COPY[audience];

  return (
    <section className="bg-paper-2 py-20 sm:py-24">
      <div className="container-x">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">{copy.title}</h2>
          </div>
          <p className="min-h-[3.5rem] max-w-md text-[15.5px] text-steel">{copy.text}</p>
        </Reveal>
        <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OTHER_SERVICES.map((service) => (
            <Item key={service.key}>
              <Link href={`/leistungen/${service.slug}`} className="card-hover group flex h-full min-h-[220px] flex-col justify-between rounded-2xl border border-line bg-white p-6">
                <div>
                  <h3 className="text-[18px] font-bold text-ink">{service.name}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-steel">{serviceCopy[service.key] ?? service.short}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-electric-deep">
                  {copy.cardCta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function AudienceManifesto() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].manifesto;

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32 grain">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-electric/12 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow justify-center text-electric-soft">{copy.eyebrow}</p>
          <h2 className="mt-5 min-h-[2.2em] text-[clamp(2rem,4.6vw,3.8rem)] font-extrabold leading-[1.04]">
            {copy.titleA} <span className="display-i font-normal text-champagne-soft">{copy.titleEm}</span>
          </h2>
          <p className="mx-auto mt-6 min-h-[5rem] max-w-2xl text-[16.5px] leading-relaxed text-silver">{copy.text}</p>
        </Reveal>

        <Stagger className="mt-16 grid gap-4 md:grid-cols-3" stagger={0.12}>
          {copy.principles.map((principle, index) => (
            <Item key={principle.t}>
              <div className="glass card-hover h-full min-h-[220px] rounded-[24px] p-7">
                <span className="text-[13px] font-bold text-electric-soft">0{index + 1}</span>
                <h3 className="mt-4 text-[21px] font-bold leading-tight">{principle.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-silver">{principle.d}</p>
              </div>
            </Item>
          ))}
        </Stagger>

        <Reveal className="mt-10 rounded-[24px] border border-white/8 bg-white/[0.03] p-6 sm:p-8" delay={0.1}>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <p className="eyebrow text-platinum">Transparenz</p>
            <p className="text-[15.5px] leading-relaxed text-silver">{copy.transparency}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AudienceProofSection() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].proof;

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container-x">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
            <h2 className="mt-4 min-h-[2.1em] text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold leading-[1.04] text-ink">{copy.title}</h2>
          </div>
          <p className="min-h-[4rem] text-[15.5px] leading-relaxed text-steel lg:col-span-5">{copy.text}</p>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 md:grid-cols-3" stagger={0.1}>
          {copy.items.map((item) => (
            <Item key={item.k}>
              <div className="h-full min-h-[180px] rounded-[24px] border border-line bg-paper p-6">
                <ShieldCheck className="h-5 w-5 text-electric-deep" />
                <p className="mt-5 text-[21px] font-extrabold text-ink">{item.k}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-steel">{item.v}</p>
              </div>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function AudienceProcess() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].process;

  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="container-x">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
          <h2 className="mt-4 min-h-[2.1em] text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.04] text-ink">{copy.title}</h2>
        </Reveal>
        <Stagger className="relative mt-14 grid gap-6 md:grid-cols-4" stagger={0.12}>
          <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent md:block" />
          {copy.steps.map((step) => (
            <Item key={step.step} className="relative min-h-[190px]">
              <span className="relative z-10 inline-grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white text-[13px] font-extrabold text-ink shadow-sm">{step.step}</span>
              <h3 className="mt-5 text-[19px] font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-steel">{step.text}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function AudienceFaqSection() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].faq;
  const business = audience === "b2b";

  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
          <h2 className="mt-4 min-h-[2.1em] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extrabold leading-[1.05] text-ink">{copy.title}</h2>
          <p className="mt-4 min-h-[4rem] text-[15.5px] leading-relaxed text-steel">{copy.text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              href={whatsappLink(business ? "Hallo TarifWerk, ich habe eine Frage zu einer Beratung für mein Unternehmen:" : "Hallo TarifWerk, ich habe eine Frage:")}
              target="_blank"
              variant="dark"
              size="sm"
              icon={<MessageCircle />}
            >
              {copy.whatsapp}
            </Button>
            <Link href="/faq" className="inline-flex h-10 items-center text-[14px] font-semibold text-electric-deep hover:underline">
              {business ? "Alle Fragen →" : "Alle Fragen →"}
            </Link>
          </div>
        </Reveal>
        <Reveal className="lg:col-span-8" delay={0.1}>
          <Accordion items={copy.items} />
        </Reveal>
      </div>
    </section>
  );
}

export function AudienceFinalCta() {
  const { audience } = useAudience();
  const copy = AUDIENCE_COPY[audience].final;
  const business = audience === "b2b";

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32 grain">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-champagne" />
          <h2 className="mt-6 min-h-[2.1em] text-[clamp(2.2rem,5.4vw,4.4rem)] font-extrabold leading-[1.0]">
            {copy.line1}
            <br />
            <span className="display-i font-normal text-platinum">{copy.line2}</span>
          </h2>
          <p className="mx-auto mt-6 min-h-[4rem] max-w-xl text-[16.5px] text-silver">{copy.text}</p>
        </Reveal>

        <Stagger className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
          <Item>
            <Link href={business ? "/anfrage?audience=b2b" : "/berater"} className="card-hover flex h-full min-h-[185px] flex-col rounded-2xl bg-electric p-6 text-white">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80">{copy.primaryEyebrow}</span>
              <span className="mt-3 text-[19px] font-bold">{copy.primary}</span>
              <span className="mt-1 text-[13.5px] text-white/85">{copy.primarySub}</span>
              <ArrowRight className="mt-auto h-5 w-5 pt-6" />
            </Link>
          </Item>
          <Item>
            <a
              href={whatsappLink(business ? "Hallo TarifWerk, ich möchte eine Business-Anfrage stellen." : undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="glass card-hover flex h-full min-h-[185px] flex-col rounded-2xl p-6"
            >
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-silver">{copy.whatsappEyebrow}</span>
              <span className="mt-3 text-[19px] font-bold">WhatsApp</span>
              <span className="mt-1 text-[13.5px] text-silver">{SITE.whatsappDisplay}</span>
              <MessageCircle className="mt-auto h-5 w-5 pt-6 text-[#25D366]" />
            </a>
          </Item>
          <Item>
            <a href={SITE.phoneHref} className="glass card-hover flex h-full min-h-[185px] flex-col rounded-2xl p-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-silver">{copy.phoneEyebrow}</span>
              <span className="mt-3 text-[19px] font-bold">Anrufen</span>
              <span className="mt-1 text-[13.5px] text-silver">{SITE.hours}</span>
              <Phone className="mt-auto h-5 w-5 pt-6 text-electric-soft" />
            </a>
          </Item>
        </Stagger>
      </div>
    </section>
  );
}
