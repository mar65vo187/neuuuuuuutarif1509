import Link from "next/link";
import { ArrowRight, Building2, MapPin, UsersRound } from "lucide-react";
import { withAudience, type AudienceMode } from "@/lib/audience";
import { SITE } from "@/lib/content";

export function BrandIdentitySection({ audience }: { audience: AudienceMode }) {
  const business = audience === "b2b";

  return (
    <section className="border-b border-line bg-paper py-14 sm:py-16" aria-labelledby="tarifwerk-brand-title">
      <div className="container-x grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="eyebrow text-electric-deep">TarifWerk · {SITE.hq}</p>
          <h2 id="tarifwerk-brand-title" className="mt-3 max-w-3xl text-[clamp(1.65rem,3.4vw,2.65rem)] font-extrabold leading-[1.04] text-ink">
            {business
              ? "Persönliche Beratung und Vermittlungskoordination für Unternehmen."
              : "Persönliche Beratung und Vermittlungskoordination für Alltag, Zuhause und Vermögen."}
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-steel">
            {business
              ? "TarifWerk bündelt für Selbstständige und Unternehmen Themen wie Telekommunikation, Energie, Absicherung, Solar, Klima und weitere betriebliche Bedarfe. Die erste Bedarfsklärung erfolgt persönlich; verfügbare Partner, Grenzen und Vergütung werden transparent eingeordnet."
              : "TarifWerk bündelt für Privatkunden Themen wie Internet und Mobilfunk, Strom und Gas, Versicherungen, Solar und Wärmepumpe, Immobilien, Edelmetalle, Klima und Sicherheit. Die erste Orientierung erfolgt persönlich; verfügbare Partner, Grenzen und Vergütung werden transparent eingeordnet."}
          </p>
          <Link href={withAudience("/ueber-uns", audience)} className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-electric-deep hover:underline">
            Mehr über TarifWerk <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4">
            <MapPin className="h-4 w-4 text-electric-deep" />
            <p className="mt-3 text-[12px] font-extrabold text-ink">Aus Wiesbaden</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-steel">Digital deutschlandweit, persönliche Termine nach Absprache.</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4">
            <UsersRound className="h-4 w-4 text-electric-deep" />
            <p className="mt-3 text-[12px] font-extrabold text-ink">{business ? "Für Unternehmen" : "Für Privatkunden"}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-steel">{business ? "Selbstständige, Teams und mehrere Standorte." : "Einzelpersonen, Paare, Familien und Eigentümer."}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4">
            <Building2 className="h-4 w-4 text-electric-deep" />
            <p className="mt-3 text-[12px] font-extrabold text-ink">Mehrere Themen</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-steel">Ein Ansprechpartner koordiniert den Überblick statt isolierter Einzelanfragen.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
