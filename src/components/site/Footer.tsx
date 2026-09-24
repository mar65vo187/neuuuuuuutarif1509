import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { REGIONS, SERVICES, SITE } from "@/lib/content";
import { LOCAL_PAGE_LIST } from "@/lib/local-pages";
import { withAudience, type AudienceMode } from "@/lib/audience";

export function Footer({ audience }: { audience: AudienceMode }) {
  const localByCity = new Map(LOCAL_PAGE_LIST.map((page) => [page.city, page.slug]));
  return (
    <footer className="relative overflow-hidden bg-ink text-silver">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-electric/10 blur-[120px]" />
      <div className="container-x relative pt-14 pb-24 md:pb-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size={38} />
            <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed">Persönliche Beratung und Vermittlungskoordination für Alltag, Zuhause und Vermögen – deutschlandweit.</p>
            <div className="mt-6 flex flex-col gap-2 text-[14.5px]">
              <a href={SITE.phoneHref} className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4 text-electric-soft" /> {SITE.whatsappDisplay}</a>
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4 text-electric-soft" /> {SITE.email}</a>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-electric-soft" /> {SITE.hq} · {SITE.hours}</span>
            </div>
          </div>

          <div className="md:col-span-3"><h2 className="eyebrow text-platinum">Leistungen</h2><ul className="mt-5 space-y-2.5 text-[14.5px]">{SERVICES.map((s) => <li key={s.slug}><Link href={withAudience(`/leistungen/${s.slug}`, audience)} className="hover:text-white">{s.name}</Link></li>)}</ul></div>
          <div className="md:col-span-2"><h2 className="eyebrow text-platinum">Unternehmen</h2><ul className="mt-5 space-y-2.5 text-[14.5px]"><li><Link href={withAudience("/berater", audience)} className="hover:text-white">Beratung</Link></li>{audience === "b2c" && <li><Link href={withAudience("/optimierungsservice", audience)} className="hover:text-white">Optimierungsservice</Link></li>}<li><Link href={withAudience("/anfrage", audience)} className="hover:text-white">Anfrage stellen</Link></li><li><Link href={withAudience("/ueber-uns", audience)} className="hover:text-white">Über uns</Link></li><li><Link href={withAudience("/karriere", audience)} className="hover:text-white">Berater werden</Link></li><li><Link href={withAudience("/freund-werben", audience)} className="hover:text-white">Freunde werben</Link></li><li><Link href={withAudience("/faq", audience)} className="hover:text-white">So funktioniert es</Link></li><li><Link href="/portal/login" className="hover:text-white">Mitarbeiter-Login</Link></li></ul></div>
          <div className="md:col-span-3"><h2 className="eyebrow text-platinum">Regionen</h2><ul className="mt-5 flex flex-wrap gap-2 text-[13px]">{REGIONS.map((r) => { const slug = localByCity.get(r); return <li key={r}>{slug ? <Link href={withAudience(`/beratung/${slug}`, audience)} className="chip border-white/10 text-silver transition hover:border-electric/50 hover:text-white">{r}</Link> : <span className="chip border-white/10 text-silver">{r}</span>}</li>; })}</ul><p className="mt-4 text-[13px] leading-relaxed text-steel">Von Wiesbaden aus digital deutschlandweit. Persönliche Vor-Ort-Termine stimmen wir individuell ab.</p></div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-5 text-[12.5px] text-steel md:flex-row md:items-center md:justify-between"><p>© {new Date().getFullYear()} TarifWerk · {SITE.founder} · Alle Rechte vorbehalten</p><div className="flex gap-5"><Link href="/impressum" className="hover:text-white">Impressum</Link><Link href="/datenschutz" className="hover:text-white">Datenschutz</Link><Link href="/agb" className="hover:text-white">AGB</Link></div></div>
      </div>
    </footer>
  );
}
