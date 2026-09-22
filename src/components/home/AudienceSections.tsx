import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Phone, Quote } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Item, Reveal, Stagger } from "@/components/ui/Reveal";
import { AUDIENCE_COPY, SERVICE_AUDIENCE_COPY } from "@/lib/audience-copy";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { SERVICES, SERVICE_IMAGES, SITE, whatsappLink } from "@/lib/content";

export function AudienceTrustStrip({ audience }: { audience: AudienceMode }) {
  const items = AUDIENCE_COPY[audience].trust;
  return (
    <section className="border-b border-line bg-paper">
      <Stagger className="container-x grid grid-cols-2 gap-x-5 gap-y-1 py-5 md:grid-cols-4 md:py-6">
        {items.map((item) => (
          <Item key={item.k} className="border-l border-line py-1 pl-4 first:border-l-0 first:pl-0 md:pl-5">
            <p className="text-[17px] font-extrabold tracking-tight text-ink sm:text-[18px]">{item.k}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-steel">{item.v}</p>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

export function AudienceFocusSection({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].focus;
  const serviceCopy = SERVICE_AUDIENCE_COPY[audience];
  const focusKeys = audience === "b2c"
    ? new Set(["energie", "internet", "versicherungen"])
    : new Set(["internet", "energie", "versicherungen"]);
  const focusServices = SERVICES.filter((service) => focusKeys.has(service.key));

  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(2rem,4.1vw,3.35rem)] font-extrabold leading-[1.02] text-ink">
              {copy.titleA}
              <br />
              <span className="display-i font-normal text-ink-700">{copy.titleEm}</span> {copy.titleB}
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={0.1}>
            <p className="max-w-xl text-[15.5px] leading-relaxed text-steel">{copy.text}</p>
          </Reveal>
        </div>

        <Stagger className="mt-10 grid gap-4 md:grid-cols-3" stagger={0.1}>
          {focusServices.map((service, index) => {
            const image = SERVICE_IMAGES[service.key];
            return (
              <Item key={service.key}>
                <Link href={withAudience(`/leistungen/${service.slug}`, audience)} className="group relative block min-h-[330px] overflow-hidden rounded-[24px] bg-ink text-white shadow-soft">
                  {image && (
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover opacity-75 transition-transform duration-700 ease-premium group-hover:scale-[1.035]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                    <span className="text-[11px] font-bold tracking-[0.16em] text-white/60">0{index + 1}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-ink/35 transition-colors duration-200 group-hover:border-electric group-hover:bg-electric">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-electric-soft">{service.eyebrow}</p>
                    <h3 className="mt-2 text-[21px] font-extrabold leading-tight">{service.name}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-silver">
                      {serviceCopy[service.key] ?? service.short}
                    </p>
                  </div>
                </Link>
              </Item>
            );
          })}
        </Stagger>
        <Reveal className="mt-7">
          <Link href={withAudience("/leistungen", audience)} className="inline-flex items-center gap-2 text-[14px] font-bold text-electric-deep hover:underline">
            Alle Leistungen ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function AudienceEverydaySection({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].everyday;
  const serviceCopy = SERVICE_AUDIENCE_COPY[audience];
  const focusKeys = new Set(["energie", "internet", "versicherungen"]);
  const remainingServices = SERVICES.filter((service) => !focusKeys.has(service.key));

  return (
    <section className="bg-paper-2 py-14 sm:py-16">
      <div className="container-x">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold leading-tight text-ink">{copy.title}</h2>
          </div>
          <p className="max-w-md text-[14.5px] leading-relaxed text-steel">{copy.text}</p>
        </Reveal>
        <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {remainingServices.map((service) => {
            const image = SERVICE_IMAGES[service.key];
            return (
              <Item key={service.key}>
                <Link href={withAudience(`/leistungen/${service.slug}`, audience)} className="card-hover group flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border border-line bg-white">
                  {image && <div className="relative h-28 overflow-hidden bg-ink">
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw" className="object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
                  </div>}
                  <div className="flex flex-1 flex-col p-5">
                    <div>
                      <h3 className="text-[17px] font-bold text-ink">{service.name}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-steel">{serviceCopy[service.key] ?? service.short}</p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-electric-deep">
                      {copy.cardCta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
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

export function AudienceManifesto({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].manifesto;

  return (
    <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-20 grain">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-electric/12 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-electric-soft">{copy.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(2rem,4.2vw,3.5rem)] font-extrabold leading-[1.03]">
            {copy.titleA} <span className="display-i font-normal text-champagne-soft">{copy.titleEm}</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-silver">{copy.text}</p>
        </Reveal>

        <Stagger className="mt-10 grid gap-3 md:grid-cols-3" stagger={0.12}>
          {copy.principles.map((principle, index) => (
            <Item key={principle.t}>
              <div className="h-full rounded-[22px] border border-white/10 bg-white/[0.035] p-6">
                <span className="text-[13px] font-bold text-electric-soft">0{index + 1}</span>
                <h3 className="mt-3 text-[19px] font-bold leading-tight">{principle.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-silver">{principle.d}</p>
              </div>
            </Item>
          ))}
        </Stagger>

        <Reveal className="mt-6 rounded-[20px] border border-white/8 bg-white/[0.025] px-5 py-4 sm:px-6" delay={0.1}>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <p className="eyebrow text-platinum">Wie wir bezahlt werden</p>
            <p className="text-[15.5px] leading-relaxed text-silver">{copy.transparency}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AudienceProcess({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].process;

  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.9rem)] font-extrabold leading-[1.04] text-ink">{copy.title}</h2>
        </Reveal>
        <Stagger className="relative mt-9 grid gap-4 md:grid-cols-4" stagger={0.12}>
          <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent md:block" />
          {copy.steps.map((step) => (
            <Item key={step.step} className="relative">
              <span className="relative z-10 inline-grid h-9 w-9 place-items-center rounded-full border border-ink/10 bg-white text-[11px] font-extrabold text-ink shadow-sm">{step.step}</span>
              <h3 className="mt-4 text-[17px] font-bold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-steel">{step.text}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function AudienceFaqSection({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].faq;
  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow text-electric-deep">{copy.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.4vw,2.7rem)] font-extrabold leading-[1.05] text-ink">{copy.title}</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-steel">{copy.text}</p>
          <div className="mt-6">
            <Link href={withAudience("/faq", audience)} className="inline-flex h-10 items-center text-[14px] font-semibold text-electric-deep hover:underline">
              Alle Fragen →
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

export function AudienceFinalCta({ audience }: { audience: AudienceMode }) {
  const copy = AUDIENCE_COPY[audience].final;
  const business = audience === "b2b";

  return (
    <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-20 grain">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/20 blur-[140px]" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Quote className="mx-auto h-7 w-7 text-champagne" />
          <h2 className="mt-4 text-[clamp(2.1rem,5vw,4rem)] font-extrabold leading-[1.0]">
            {copy.line1}
            <br />
            <span className="display-i font-normal text-platinum">{copy.line2}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-silver">{copy.text}</p>
        </Reveal>

        <Stagger className="mx-auto mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
          <Item>
            <Link href={withAudience(business ? "/anfrage" : "/berater", audience)} className="card-hover flex h-full min-h-[155px] flex-col rounded-2xl bg-electric p-5 text-white">
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
              className="glass card-hover flex h-full min-h-[155px] flex-col rounded-2xl p-5"
            >
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-silver">{copy.whatsappEyebrow}</span>
              <span className="mt-3 text-[19px] font-bold">WhatsApp</span>
              <span className="mt-1 text-[13.5px] text-silver">{SITE.whatsappDisplay}</span>
              <MessageCircle className="mt-auto h-5 w-5 pt-6 text-[#25D366]" />
            </a>
          </Item>
          <Item>
            <a href={SITE.phoneHref} className="glass card-hover flex h-full min-h-[155px] flex-col rounded-2xl p-5">
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
