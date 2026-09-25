"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SITE, SERVICES } from "@/lib/content";
import { withAudience, type AudienceMode } from "@/lib/audience";

const NAV = [
  { href: "/leistungen", label: "Leistungen", audience: "all" as const },
  { href: "/optimierungsservice", label: "Optimierungsservice", audience: "b2c" as const },
  { href: "/berater", label: "Beratung", audience: "all" as const },
  { href: "/ueber-uns", label: "Über uns", audience: "all" as const },
  { href: "/karriere", label: "Karriere", audience: "all" as const },
  { href: "/freund-werben", label: "Freund werben", audience: "all" as const },
  { href: "/faq", label: "So funktioniert es", audience: "all" as const },
];

export function Header({ initialAudience }: { initialAudience: AudienceMode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AudienceMode>(initialAudience);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const rememberAudience = (mode: AudienceMode) => {
    setAudience(mode);
    document.cookie = "tarifwerk-audience=" + mode + "; Path=/; Max-Age=2592000; SameSite=Lax";
  };

  const audienceHref = (mode: AudienceMode) => withAudience(pathname || "/", mode);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 24;
      setScrolled((current) => current === next ? current : next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : "";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [
        toggleRef.current,
        ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']") ?? []),
      ].filter((element): element is HTMLElement => Boolean(element && element.getClientRects().length));
      if (!controls.length) return;
      const position = controls.indexOf(document.activeElement as HTMLElement);
      if (position === -1 || (event.shiftKey && position === 0) || (!event.shiftKey && position === controls.length - 1)) {
        event.preventDefault();
        controls[event.shiftKey ? controls.length - 1 : 0].focus();
      }
    };

    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    if (open) requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("a[href]")?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  const visibleNav = NAV.filter((item) => item.audience === "all" || item.audience === audience);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-electric focus:px-4 focus:py-2 focus:text-white">Zum Inhalt springen</a>
      <header className="fixed inset-x-0 top-0 z-50 hero-enter [--hero-delay:40ms]">
        <div className={`transition-[background-color,border-color,backdrop-filter] duration-300 ease-premium ${scrolled || open ? "border-b border-white/8 bg-ink/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
          <div className="container-x flex h-[72px] items-center justify-between">
            <Logo size={34} imageSrc="/assets/logo-symbol.jpg" />
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Hauptnavigation">
              {visibleNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return <Link key={item.href} href={withAudience(item.href, audience)} aria-current={active ? "page" : undefined} className={`relative rounded-full px-3 py-2 text-[14px] font-medium transition-colors duration-200 ${active ? "text-white" : "text-silver hover:text-white"}`}>{item.label}{active && <span aria-hidden="true" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-electric" />}</Link>;
              })}
            </nav>
            <div className="hidden items-center gap-3 xl:flex">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Zielgruppe wählen">
                <Link href={audienceHref("b2c")} onClick={() => rememberAudience("b2c")} aria-current={audience === "b2c" ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${audience === "b2c" ? "bg-white text-ink" : "text-silver hover:bg-white/8 hover:text-white"}`}>Privat</Link>
                <Link href={audienceHref("b2b")} onClick={() => rememberAudience("b2b")} aria-current={audience === "b2b" ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${audience === "b2b" ? "bg-electric text-white" : "text-silver hover:bg-white/8 hover:text-white"}`}>Business</Link>
              </div>
              <Button href={withAudience("/anfrage", audience)} size="sm" iconRight={<ArrowRight />}>Beratung starten</Button>
            </div>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/12 text-white xl:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Menü schließen" : "Menü öffnen"} ref={toggleRef} aria-controls="mobile-menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </header>
      {open && <div key="mobile-menu" id="mobile-menu" ref={menuRef} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a")) setOpen(false); }} className="menu-enter fixed inset-0 z-40 bg-ink/95 backdrop-blur-xl xl:hidden">
        <div className="container-x flex h-full flex-col overflow-y-auto pb-8 pt-[88px]">
          <nav className="flex shrink-0 flex-col" aria-label="Mobile Navigation">
            {visibleNav.map((item, index) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return <Link key={item.href} href={withAudience(item.href, audience)} aria-current={active ? "page" : undefined} style={{ animationDelay: `${60 + index * 35}ms` }} className="hero-enter flex items-center justify-between border-b border-white/8 py-4 text-[26px] font-semibold tracking-tight text-white">{item.label}<ArrowRight className="h-5 w-5 text-electric-soft" aria-hidden="true" /></Link>;
            })}
          </nav>
          <div className="mt-5 inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Zielgruppe wählen">
            <Link href={audienceHref("b2c")} onClick={() => rememberAudience("b2c")} aria-current={audience === "b2c" ? "page" : undefined} className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${audience === "b2c" ? "bg-white text-ink" : "text-silver hover:bg-white/8 hover:text-white"}`}>Privat</Link>
            <Link href={audienceHref("b2b")} onClick={() => rememberAudience("b2b")} aria-current={audience === "b2b" ? "page" : undefined} className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${audience === "b2b" ? "bg-electric text-white" : "text-silver hover:bg-white/8 hover:text-white"}`}>Business</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">{SERVICES.map((service) => <Link key={service.slug} href={withAudience(`/leistungen/${service.slug}`, audience)} className="chip border-white/12 text-silver transition-colors hover:border-electric hover:text-white">{service.shortLabel || service.name}</Link>)}</div>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
            <Button href={withAudience("/anfrage", audience)} size="lg" iconRight={<ArrowRight />} className="w-full">Beratung starten</Button>
            <Button href={SITE.phoneHref} variant="secondary" icon={<Phone />} className="w-full">Anrufen</Button>
          </div>
        </div>
      </div>}
    </>
  );
}
