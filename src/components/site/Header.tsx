"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, MessageCircle, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SITE, SERVICES, whatsappLink } from "@/lib/content";

const NAV = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/berater", label: "Beratung" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/karriere", label: "Karriere" },
  { href: "/faq", label: "So funktioniert es" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

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

    const desktop = window.matchMedia("(min-width: 1024px)");
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

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-electric focus:px-4 focus:py-2 focus:text-white">Zum Inhalt springen</a>
      <header className="fixed inset-x-0 top-0 z-50 hero-enter [--hero-delay:40ms]">
        <div className={`transition-[background-color,border-color,backdrop-filter] duration-300 ease-premium ${scrolled || open ? "border-b border-white/8 bg-ink/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
          <div className="container-x flex h-[72px] items-center justify-between">
            <Logo size={34} imageSrc="/assets/logo-symbol.jpg" />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative rounded-full px-4 py-2 text-[14.5px] font-medium transition-colors duration-200 ${active ? "text-white" : "text-silver hover:text-white"}`}>{item.label}{active && <span aria-hidden="true" className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-electric" />}</Link>;
              })}
            </nav>
            <div className="hidden items-center gap-2 lg:flex">
              <a href={whatsappLink("Hallo TarifWerk, ich hätte eine Frage.")} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-white/12 text-white/85 transition-colors duration-200 hover:bg-white/10 hover:text-white" aria-label="WhatsApp schreiben"><MessageCircle className="h-[18px] w-[18px]" /></a>
              <Button href="/anfrage" size="sm" iconRight={<ArrowRight />}>Beratung starten</Button>
            </div>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-white/12 text-white lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Menü schließen" : "Menü öffnen"} ref={toggleRef} aria-controls="mobile-menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </header>
      {open && <div key="mobile-menu" id="mobile-menu" ref={menuRef} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a")) setOpen(false); }} className="menu-enter fixed inset-0 z-40 bg-ink/95 backdrop-blur-xl lg:hidden">
        <div className="container-x flex h-full flex-col overflow-y-auto pb-8 pt-[88px]">
          <nav className="flex shrink-0 flex-col" aria-label="Mobile Navigation">
            {NAV.map((item, index) => <Link key={item.href} href={item.href} style={{ animationDelay: `${60 + index * 35}ms` }} className="hero-enter flex items-center justify-between border-b border-white/8 py-4 text-[26px] font-semibold tracking-tight text-white">{item.label}<ArrowRight className="h-5 w-5 text-electric-soft" /></Link>)}
          </nav>
          <div className="mt-6 flex flex-wrap gap-2">{SERVICES.map((service) => <Link key={service.slug} href={`/leistungen/${service.slug}`} className="chip border-white/12 text-silver transition-colors hover:border-electric hover:text-white">{service.shortLabel || service.name}</Link>)}</div>
          <div className="mt-auto grid gap-3 pt-8">
            <Button href="/anfrage" size="lg" iconRight={<ArrowRight />} className="w-full">Beratung starten</Button>
            <div className="grid grid-cols-2 gap-3"><Button href={whatsappLink()} target="_blank" variant="whatsapp" icon={<MessageCircle />} className="w-full">WhatsApp</Button><Button href={SITE.phoneHref} variant="secondary" icon={<Phone />} className="w-full">Anrufen</Button></div>
          </div>
        </div>
      </div>}
    </>
  );
}
