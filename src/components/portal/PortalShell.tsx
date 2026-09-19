"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BriefcaseBusiness, ContactRound, ExternalLink, Gift, Inbox, LineChart,
  KeyRound, Lightbulb, ListTodo, LogOut, MessageSquare, PackageSearch, Search, Settings2, ShieldCheck, Sparkles, TrendingUp, UserRoundCog, UsersRound, WalletCards,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { PortalHelpPanel } from "@/components/portal/PortalHelpPanel";
import type { SessionUser } from "@/lib/auth";
import { getPortalHelp } from "@/lib/portal-help";

const NAV = [
  { href: "/portal", label: "Übersicht", icon: BarChart3, exact: true },
  { href: "/portal/leads", label: "Anfragen & Termine", icon: Inbox },
  { href: "/portal/kunden", label: "Kunden", icon: ContactRound },
  { href: "/portal/auftraege", label: "Aufträge", icon: BriefcaseBusiness },
  { href: "/portal/produkte", label: "Produkte & Partner", icon: PackageSearch },
  { href: "/portal/betrieb", label: "Team & Betrieb", icon: UsersRound },
  { href: "/portal/aufgaben", label: "Aufgaben", icon: ListTodo },
  { href: "/portal/finanzen", label: "Provisionen", icon: WalletCards },
  { href: "/portal/verguetung", label: "Vergütung & Karriere", icon: TrendingUp },
  { href: "/portal/reporting", label: "Reporting", icon: LineChart },
  { href: "/portal/chat", label: "Interne Chats", icon: MessageSquare },
  { href: "/portal/einstellungen", label: "Einstellungen", icon: KeyRound },
  { href: "/portal/sicherheit", label: "Sicherheit", icon: ShieldCheck },
  { href: "/portal/empfehlungen", label: "Empfehlungen", icon: Gift, adminOnly: true },
  { href: "/portal/system", label: "System", icon: Settings2, adminOnly: true },
];

export function PortalShell({ user, children, openCount }: { user: SessionUser; children: ReactNode; openCount: number }) {
  const pathname = usePathname();
  const loggingOut = useRef(false);
  const [logoutError, setLogoutError] = useState<string | undefined>();
  const [navQuery, setNavQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPath, setHelpPath] = useState(pathname);

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

  const navigation = NAV.filter((item) => (!item.adminOnly || user.role === "admin") && (!navQuery.trim() || item.label.toLowerCase().includes(navQuery.trim().toLowerCase())));
  const currentHelp = getPortalHelp(pathname);
  const selectedHelp = getPortalHelp(helpPath);
  const openHelp = (path = pathname) => { setHelpPath(path); setHelpOpen(true); };

  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink px-5 py-3 text-white lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:border-white/8 lg:px-5 lg:py-6">
        <Logo size={30} href="/portal" />
        <div className="hidden lg:mt-6 lg:block"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver" /><input value={navQuery} onChange={(event) => setNavQuery(event.target.value)} className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.055] pl-9 pr-3 text-[12.5px] text-white placeholder:text-silver/65 focus:border-electric/50 focus:outline-none focus:ring-2 focus:ring-electric/15" placeholder="Bereich suchen…" aria-label="Portalbereich suchen" /></label></div>
        <nav className="no-scrollbar flex max-w-[calc(100vw-120px)] gap-1 overflow-x-auto lg:mt-5 lg:max-w-none lg:flex-col lg:overflow-y-auto" aria-label="Portal">
          {navigation.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <div key={n.href} className={`group/nav flex shrink-0 items-center rounded-xl transition ${active ? "bg-white/10" : "hover:bg-white/6"}`}>
                <Link href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${active ? "text-white" : "text-silver hover:text-white"}`}>
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-electric-soft" : ""}`} />
                  <span className="hidden lg:inline">{n.label}</span>
                  {n.href === "/portal/leads" && openCount > 0 && <span className="ml-auto hidden rounded-full bg-electric px-2 py-0.5 text-[11px] font-bold text-white lg:inline">{openCount}</span>}
                </Link>
                <button type="button" onClick={() => openHelp(n.href)} className="mr-1 hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-silver/55 transition hover:bg-champagne/10 hover:text-champagne-soft lg:grid" aria-label={`Info zu ${n.label}`} title={`Info zu ${n.label}`}><Lightbulb className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
          {user.role === "admin" && (
            <Link
              href="/portal/verwaltung"
              aria-current={pathname.startsWith("/portal/verwaltung") ? "page" : undefined}
              className={`inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${pathname.startsWith("/portal/verwaltung") ? "bg-white/10 text-white" : "text-silver hover:bg-white/6 hover:text-white"}`}
            >
              <UserRoundCog className="h-4.5 w-4.5" />
              <span className="hidden lg:inline">Mitarbeiter verwalten</span>
            </Link>
          )}
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
        <button type="button" onClick={logout} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-silver hover:bg-white/10 lg:hidden" aria-label={logoutError ?? "Abmelden"} title={logoutError}><LogOut className="h-4 w-4" /></button>
      </aside>
      <div className="min-w-0"><div className="sticky top-0 z-20 hidden border-b border-line bg-paper/90 backdrop-blur-xl lg:block"><div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-8 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl border border-electric/15 bg-electric/[0.07] text-electric-deep"><Sparkles className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="truncate text-[12.5px] font-bold">{currentHelp.title}</p><p className="truncate text-[10.5px] text-steel">{currentHelp.purpose}</p></div></div><button type="button" onClick={() => openHelp()} className="inline-flex h-9 items-center gap-2 rounded-full border border-champagne/25 bg-champagne/8 px-4 text-[12px] font-bold text-ink transition hover:border-champagne/45 hover:bg-champagne/15"><Lightbulb className="h-4 w-4 text-amber-500" />Was kann ich hier machen?</button></div></div><div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-9">{children}</div></div>
      <button type="button" onClick={() => openHelp()} className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-2xl border border-champagne/30 bg-ink text-champagne-soft shadow-[0_18px_50px_-15px_rgba(6,11,22,0.65)] lg:hidden" aria-label={`Info zu ${currentHelp.title}`}><Lightbulb className="h-5 w-5" /></button>
      <PortalHelpPanel topic={selectedHelp} open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
