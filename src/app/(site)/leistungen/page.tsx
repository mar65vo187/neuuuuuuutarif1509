import { audiencePageMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Item, Stagger } from "@/components/ui/Reveal";
import { AudienceFinalCta } from "@/components/home/AudienceSections";
import { SERVICES, SERVICE_IMAGES } from "@/lib/content";
import { resolveSiteAudience } from "@/lib/audience-server";
import { withAudience } from "@/lib/audience";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  return audiencePageMetadata("/leistungen" as const, await resolveSiteAudience((await searchParams).audience));
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  const audience = await resolveSiteAudience((await searchParams).audience);
  const business = audience === "b2b";
  return (
    <>
      <PageHero
        eyebrow="Leistungen"
        title={
          <>
            Ein Ansprechpartner. <span className="display-i font-normal text-champagne-soft">Acht Bereiche.</span>
          </>
        }
        text={business ? "Von Telekommunikation und Energie bis Absicherung und Investition: Wir bündeln mehrere Themen, damit Sie nicht jede Anforderung mit einem neuen Ansprechpartner von vorne beginnen." : "Von Mobilfunk und Energie bis Solar, Versicherungen und Immobilien: Du bekommst einen Gesamtblick statt acht Hotlines und acht neuer Erklärungen."}
        compact
      />
      <section className="bg-paper py-20">
        <div className="container-x">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
            {SERVICES.map((s, i) => {
              const img = SERVICE_IMAGES[s.key];
              return (
                <Item key={s.key} className={s.featured && i === 0 ? "sm:col-span-2 lg:col-span-2" : ""}>
                  <Link href={withAudience(`/leistungen/${s.slug}`, audience)} className={`group card-hover relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-[26px] border border-line p-7 ${img ? "bg-ink text-white" : "bg-white text-ink"}`}>
                    {img && (
                      <>
                        <Image src={img.src} alt={img.alt} fill sizes={s.featured && i === 0 ? "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"} className="object-cover opacity-70 transition-transform duration-[1400ms] ease-premium group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
                      </>
                    )}
                    <div className="relative flex items-start justify-between">
                      <span className={`chip ${img ? "border-white/15 bg-ink/40 text-platinum backdrop-blur" : "border-line bg-paper text-steel"}`}>
                        {s.featured ? "Schwerpunkt" : "Alltag"}
                      </span>
                      <span className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-500 group-hover:bg-electric group-hover:border-electric group-hover:text-white ${img ? "border-white/15 bg-ink/40 backdrop-blur" : "border-line"}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="relative">
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${img ? "text-electric-soft" : "text-electric-deep"}`}>{s.eyebrow}</p>
                      <h2 className="mt-2 text-[24px] font-extrabold leading-tight">{s.name}</h2>
                      <p className={`mt-2 text-[14.5px] leading-snug ${img ? "text-silver" : "text-steel"}`}>{s.short}</p>
                    </div>
                  </Link>
                </Item>
              );
            })}
          </Stagger>
        </div>
      </section>
      <AudienceFinalCta audience={audience} />
    </>
  );
}
