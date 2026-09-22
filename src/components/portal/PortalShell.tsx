"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, BrainCircuit, BriefcaseBusiness, ContactRound, ExternalLink, FileCheck2, Gift, Inbox, LineChart, Megaphone,
  KeyRound, Lightbulb, ListTodo, LogOut, Menu, MessageSquare, PackageSearch, Search, Settings2, ShieldCheck, Sparkles, TrendingUp, Trophy, UserRoundCog, UsersRound, WalletCards, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { PortalHelpPanel } from "@/components/portal/PortalHelpPanel";
import { PortalCommandPalette } from "@/components/portal/PortalCommandPalette";
import type { SessionUser } from "@/lib/auth";
import { getPortalHelp } from "@/lib/portal-help";

const NAV_SECTIONS = [
  {
    label: "Täglich arbeiten",
    items: [
      { href: "/portal", label: "Übersicht & Fokus", icon: BarChart3, exact: true },
      { href: "/portal/assistent", label: "KI & Arbeitsassistent", icon: BrainCircuit },
      { href: "/portal/leads", label: "Leads & Termine", icon: Inbox, anyPermission: ["lead.edit"] },
      { href: "/portal/kunden", label: "Kunden", icon: ContactRound, anyPermission: ["customer.read", "customer.edit"] },
      { href: "/portal/auftraege", label: "Aufträge", icon: BriefcaseBusiness, anyPermission: ["order.read", "order.edit"] },
      { href: "/portal/aufgaben", label: "Aufgaben", icon: ListTodo, anyPermission: ["task.manage"] },
      { href: "/portal/inbox", label: "Action Inbox", icon: Bell },
    ],
  },
  {
    label: "Vertrieb & Wissen",
    items: [
      { href: "/portal/produkte", label: "Produkte & Partner", icon: PackageSearch },
      { href: "/portal/kampagnen", label: "Kampagnen", icon: Megaphone, anyPermission: ["report.sales"] },
      { href: "/portal/empfehlungen", label: "Empfehlungen", icon: Gift, adminOnly: true },
    ],
  },
  {
    label: "Team & Entwicklung",
    items: [
      { href: "/portal/betrieb", label: "Team & Betriebsqualität", icon: UsersRound },
      { href: "/portal/rennen", label: "Team-Challenges", icon: Trophy },
      { href: "/portal/verguetung", label: "Vergütung & Karriere", icon: TrendingUp },
      { href: "/portal/chat", label: "Team-Chat", icon: MessageSquare },
      { href: "/portal/verwaltung", label: "Mitarbeiter verwalten", icon: UserRoundCog, adminOnly: true },
    ],
  },
  {
    label: "Steuerung",
    items: [
      { href: "/portal/finanzen", label: "Provisionsübersicht", icon: WalletCards, anyPermission: ["commission.read.self", "commission.read.team", "commission.read.all", "report.finance"] },
      { href: "/portal/reporting", label: "Auswertungen", icon: LineChart, anyPermission: ["report.sales", "report.finance"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/portal/einstellungen", label: "Mein Zugang", icon: KeyRound },
      { href: "/portal/sicherheit", label: "Sicherheit", icon: ShieldCheck },
      { href: "/portal/audit", label: "Audit & Compliance", icon: FileCheck2, anyPermission: ["audit.read"] },
      { href: "/portal/system", label: "Automationen & Integrationen", icon: Settings2, adminOnly: true },
    ],
  },
] as const;


export function PortalShell({
  user,
  permissions,
  children,
  openCount,
  notificationCount,
}: {
  user: SessionUser;
  permissions: string[];
  children: ReactNode;
  openCount: number;
  notificationCount: number;
}) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const loggingOut = useRef(false);
  const [logoutError, setLogoutError] = useState<string | undefined>();
  const [navQuery, setNavQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPath, setHelpPath] = useState(pathname);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const logout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setLogoutError(undefined);
    try {
      const response = await fetch("/api/portal/logout", { method: "POST", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Logout failed");
      window.location.replace("/portal/login");
    } catch {
      setLogoutError("Abmelden fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      loggingOut.current = false;
    }
  };

  const normalizedNavQuery = navQuery.trim().toLowerCase();
  const permissionSet = new Set(permissions);
  const can = (keys: readonly string[]) => permissionSet.has("*") || keys.some((key) => permissionSet.has(key));
  const navigationSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      (!("adminOnly" in item) || !item.adminOnly || user.role === "admin")
      && (!("anyPermission" in item) || can(item.anyPermission))
      && (!normalizedNavQuery || item.label.toLowerCase().includes(normalizedNavQuery)),
    ),
  })).filter((section) => section.items.length > 0);
  const currentHelp = getPortalHelp(pathname);
  const selectedHelp = getPortalHelp(helpPath);
  const openHelp = (path = pathname) => { setHelpPath(path); setHelpOpen(true); };

  const closeMobileMenu = () => mobileMenu.current?.close();

  return (
    <div className="portal-shell min-h-screen bg-[radial-gradient(circle_at_82%_-8%,rgba(79,141,255,0.22),transparent_34%),radial-gradient(circle_at_8%_108%,rgba(217,184,119,0.12),transparent_32%),linear-gradient(145deg,#06101f_0%,#0a1426_48%,#07111f_100%)] text-slate-100 lg:grid lg:grid-cols-[284px_1fr]">
      <a href="#portal-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-blue-600 focus:px-5 focus:py-3 focus:text-white">Zum Arbeitsbereich</a>
      <aside className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[radial-gradient(circle_at_top_left,rgba(79,141,255,0.16),transparent_32%),#060b16] px-5 py-3 text-white lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:border-white/8 lg:px-5 lg:py-6">
        <div className="flex min-w-0 items-center gap-3"><Logo size={34} href="/portal" withWordmark={false} /><div className="min-w-0"><p className="text-sm font-extrabold tracking-wide text-white">TarifWerk CRM</p><p className="mt-0.5 truncate text-xs text-silver"><span className="lg:hidden">{currentHelp.title}</span><span className="hidden lg:inline">Vertrieb & Betrieb</span></p></div></div>
        <div className="hidden lg:mt-6 lg:block"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver" /><input value={navQuery} onChange={(event) => setNavQuery(event.target.value)} className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.055] pl-9 pr-3 text-[12.5px] text-white placeholder:text-silver/65 focus:border-electric/50 focus:outline-none focus:ring-2 focus:ring-electric/15" placeholder="Bereich suchen…" aria-label="Portalbereich suchen" /></label></div>
        <nav className="no-scrollbar hidden lg:mt-5 lg:flex lg:max-w-none lg:flex-col lg:gap-4 lg:overflow-y-auto" aria-label="Portal">
          {navigationSections.map((section) => (
            <div key={section.label} className="contents lg:block">
              <p className="mb-1 hidden px-3 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-silver/45 lg:block">{section.label}</p>
              <div className="contents lg:block lg:space-y-0.5">
                {section.items.map((n) => {
                  const exact = "exact" in n && n.exact;
                  const active = exact ? pathname === n.href : pathname.startsWith(n.href);
                  const Icon = n.icon;
                  return (
                    <div key={n.href} className={`group/nav flex shrink-0 items-center rounded-xl transition ${active ? "bg-white/10" : "hover:bg-white/6"}`}>
                      <Link href={n.href}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${active ? "text-white" : "text-silver hover:text-white"}`}>
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-electric-soft" : ""}`} />
                        <span className="hidden lg:inline">{n.label}</span>
                        {n.href === "/portal/leads" && openCount > 0 && <span className="ml-auto hidden rounded-full bg-electric px-2 py-0.5 text-[11px] font-bold text-white lg:inline">{openCount}</span>}
                        {n.href === "/portal/inbox" && notificationCount > 0 && <span className="ml-auto hidden rounded-full bg-champagne px-2 py-0.5 text-[11px] font-extrabold text-ink lg:inline">{notificationCount > 99 ? "99+" : notificationCount}</span>}
                      </Link>
                      <button type="button" onClick={() => openHelp(n.href)} className="mr-1 hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-silver/55 transition hover:bg-champagne/10 hover:text-champagne-soft lg:grid" aria-label={`Info zu ${n.label}`} title={`Info zu ${n.label}`}><Lightbulb className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="hidden lg:mt-auto lg:block">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-silver hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> Website öffnen</Link>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-platinum to-electric text-[12px] font-extrabold text-ink">{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{user.name}</p>
              <p className="text-[11.5px] uppercase tracking-wider text-silver">{user.role === "admin" ? "Administrator" : "Mitarbeiter"}</p>
            </div>
            <button type="button" onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-silver hover:bg-white/10 hover:text-white" aria-label={logoutError ?? "Abmelden"} title={logoutError}><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" onClick={() => setCommandOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-silver hover:bg-white/10" aria-label="Portal durchsuchen"><Search className="h-5 w-5" /></button>
          <button type="button" onClick={() => mobileMenu.current?.showModal()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 text-white hover:bg-white/10" aria-label="Navigation öffnen" aria-haspopup="dialog"><Menu className="h-5 w-5" /></button>
        </div>
      </aside>
      <dialog ref={mobileMenu} aria-labelledby="portal-navigation-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-600 bg-slate-950 p-5 text-slate-100 shadow-2xl backdrop:bg-black/70" onClick={(event) => { if (event.target === event.currentTarget) closeMobileMenu(); }}>
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="portal-navigation-title" className="text-lg font-bold">Dein Arbeitsbereich</h2><p className="mt-1 text-sm text-slate-400">{user.name}</p></div>
          <button type="button" onClick={closeMobileMenu} aria-label="Navigation schließen" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <label className="mt-5 block text-sm font-medium">Bereich suchen<input value={navQuery} onChange={(event) => setNavQuery(event.target.value)} className="field mt-2 min-h-11" placeholder="Leads, Kunden, Aufgaben …" /></label>
        <nav aria-label="Mobile Portalnavigation" className="mt-5 space-y-5">
          {navigationSections.map((section) => <section key={section.label}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{section.label}</h3>
            <div className="space-y-1">{section.items.map((item) => {
              const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} onClick={closeMobileMenu} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-blue-600 text-white" : "text-slate-200 hover:bg-slate-800"}`}><Icon className="h-5 w-5 shrink-0" />{item.label}</Link>;
            })}</div>
          </section>)}
          {navigationSections.length === 0 && <p className="text-sm text-slate-400" role="status">Kein Bereich gefunden. Versuche einen anderen Suchbegriff.</p>}
        </nav>
        <button type="button" onClick={logout} className="mt-6 flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-700 px-3 text-sm font-semibold"><LogOut className="h-5 w-5" />Abmelden</button>
        {logoutError && <p role="alert" className="mt-3 text-sm text-red-300">{logoutError}</p>}
      </dialog>
      <div className="portal-workspace min-w-0"><div className="sticky top-0 z-20 hidden border-b border-white/10 bg-ink-900/95 text-white shadow-[0_14px_40px_-28px_rgba(6,11,22,0.9)] backdrop-blur-xl lg:block"><div className="mx-auto flex max-w-[1240px] items-center gap-4 px-8 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl border border-electric/25 bg-electric/10 text-electric-soft"><Sparkles className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="truncate text-[12.5px] font-bold text-white">{currentHelp.title}</p><p className="truncate text-[10.5px] text-silver">{currentHelp.purpose}</p></div></div><button type="button" onClick={() => setCommandOpen(true)} className="ml-auto flex h-9 min-w-[240px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-left text-[12px] text-silver shadow-sm transition hover:border-electric/35 hover:bg-white/[0.08] hover:text-white"><Search className="h-4 w-4 text-electric-soft" /><span className="flex-1">Alles durchsuchen…</span><kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-silver">⌘K</kbd></button><button type="button" onClick={() => openHelp()} className="inline-flex h-9 items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-4 text-[12px] font-bold text-champagne-soft transition hover:border-champagne/50 hover:bg-champagne/15"><Lightbulb className="h-4 w-4 text-champagne" />Hilfe</button></div></div><main id="portal-content" tabIndex={-1} className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-6 outline-none sm:px-8 lg:py-8">{children}</main></div>
      <button type="button" onClick={() => openHelp()} className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-2xl border border-champagne/30 bg-ink text-champagne-soft shadow-[0_18px_50px_-15px_rgba(6,11,22,0.65)] lg:hidden" aria-label={`Info zu ${currentHelp.title}`}><Lightbulb className="h-5 w-5" /></button>
      <PortalCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} role={user.role} permissions={permissions} />
      <PortalHelpPanel topic={selectedHelp} open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
