"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BrainCircuit, BriefcaseBusiness, CalendarClock, ContactRound, FileCheck2, Inbox, LayoutDashboard, LineChart, ListTodo, Loader2,
  Megaphone, PackageSearch, Search, Settings2, Trophy, X,
} from "lucide-react";

type Result = {
  id: string;
  kind: "lead" | "customer" | "order" | "task" | "employee";
  title: string;
  subtitle: string;
  href: string;
};

const KIND_LABEL: Record<Result["kind"], string> = {
  lead: "Lead",
  customer: "Kunde",
  order: "Auftrag",
  task: "Aufgabe",
  employee: "Mitarbeiter",
};

export function PortalCommandPalette({
  open,
  onClose,
  role,
  permissions,
}: {
  open: boolean;
  onClose: () => void;
  role: "admin" | "berater";
  permissions: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const shortcuts = useMemo(() => {
    const permissionSet = new Set(permissions);
    const can = (...keys: string[]) => permissionSet.has("*") || keys.some((key) => permissionSet.has(key));
    return [
      { id: "assistant", title: "Arbeitsassistent", subtitle: "Erklärbare Prioritäten aus CRM-Daten", href: "/portal/assistent", icon: BrainCircuit },
      ...(can("lead.edit") ? [
        { id: "today-followups", title: "Heute nachfassen", subtitle: "Fällige Wiedervorlagen direkt abarbeiten", href: "/portal/leads?next=today&sort=next", icon: CalendarClock },
        { id: "pipeline", title: "Lead-Pipeline", subtitle: "Leads nach Vertriebsphase steuern", href: "/portal/leads/pipeline", icon: LayoutDashboard },
        { id: "new-lead", title: "Neue Anfrage anlegen", subtitle: "Lead manuell erfassen", href: "/portal/leads/neu", icon: Inbox },
      ] : []),
      ...(can("customer.edit") ? [{ id: "new-customer", title: "Neuen Kunden anlegen", subtitle: "Kundenakte erstellen", href: "/portal/kunden/neu", icon: ContactRound }] : []),
      ...(can("order.create") ? [{ id: "new-order", title: "Neuen Auftrag anlegen", subtitle: "Vertrag / Auftrag erfassen", href: "/portal/auftraege/neu", icon: BriefcaseBusiness }] : []),
      ...(can("task.manage") ? [{ id: "tasks", title: "Aufgaben öffnen", subtitle: "Wiedervorlagen und offene Nacharbeit", href: "/portal/aufgaben", icon: ListTodo }] : []),
      { id: "products", title: "Produkte & Partner", subtitle: "Vertriebswissen und Abschlusswege", href: "/portal/produkte", icon: PackageSearch },
      ...(can("lead.edit") ? [{ id: "team-challenges", title: "Team-Challenges", subtitle: "Monats-Rennstrecke und Empfehlungsturm", href: "/portal/rennen", icon: Trophy }] : []),
      ...(can("report.sales") ? [{ id: "campaigns", title: "Kampagnen öffnen", subtitle: "Landingpages, UTM-Links und Attribution", href: "/portal/kampagnen", icon: Megaphone }] : []),
      ...(can("report.sales") ? [{ id: "reporting", title: "Auswertungen öffnen", subtitle: "Pipeline, Leistung und Datenqualität", href: "/portal/reporting", icon: LineChart }] : []),
      ...(can("audit.read") ? [{ id: "audit", title: "Audit & Compliance", subtitle: "Änderungen, Akteure und Systemereignisse nachvollziehen", href: "/portal/audit", icon: FileCheck2 }] : []),
      ...(role === "admin" ? [{ id: "system", title: "Automationen & Integrationen", subtitle: "Automationen und Integrationen administrieren", href: "/portal/system", icon: Settings2 }] : []),
    ];
  }, [permissions, role]);

  const visibleShortcuts = query.trim()
    ? shortcuts.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()))
    : shortcuts;

  const totalItems = [...visibleShortcuts.map((item) => ({ href: item.href })), ...results.map((item) => ({ href: item.href }))];

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/portal/search?q=${encodeURIComponent(value)}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const json = await response.json().catch(() => null) as { ok?: boolean; results?: Result[]; error?: string } | null;
        if (response.status === 401) {
          window.location.replace("/portal/login?next=%2Fportal");
          return;
        }
        if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Suche fehlgeschlagen.");
        setResults(json.results ?? []);
        setActiveIndex(0);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Suche fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/55 px-4 pt-[8vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_30px_100px_-28px_rgba(6,11,22,0.75)]" role="dialog" aria-modal="true" aria-label="Portal durchsuchen">
        <div className="flex items-center gap-3 border-b border-line px-4 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-electric-deep" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setActiveIndex(0);
              if (next.trim().length < 2) {
                setResults([]);
                setLoading(false);
                setError("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => totalItems.length ? (index + 1) % totalItems.length : 0);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => totalItems.length ? (index - 1 + totalItems.length) % totalItems.length : 0);
              }
              if (event.key === "Enter" && totalItems[activeIndex]) {
                event.preventDefault();
                window.location.assign(totalItems[activeIndex].href);
              }
            }}
            className="h-16 min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:text-steel/70"
            placeholder="Suchen oder Aktion starten …"
            aria-label="Globale Suche"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-steel" aria-label="Suche läuft" />}
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-steel hover:bg-paper hover:text-ink" aria-label="Suche schließen">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-3 sm:p-4">
          {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">{error}</p>}

          {visibleShortcuts.length > 0 && (
            <div>
              <p className="px-2 pb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-steel">Schnellzugriff</p>
              <div className="space-y-1">
                {visibleShortcuts.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === activeIndex;
                  return (
                    <Link key={item.id} href={item.href} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-electric/10 ring-1 ring-electric/20" : "hover:bg-paper"}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-white"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{item.title}</span><span className="block truncate text-[11.5px] text-steel">{item.subtitle}</span></span>
                      <ArrowRight className="h-4 w-4 text-steel" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && (
            <div className={visibleShortcuts.length ? "mt-5 border-t border-line pt-4" : ""}>
              <p className="px-2 pb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-steel">Daten</p>
              {results.length ? (
                <div className="space-y-1">
                  {results.map((item, resultIndex) => {
                    const index = visibleShortcuts.length + resultIndex;
                    const active = index === activeIndex;
                    return (
                      <Link key={item.id} href={item.href} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-electric/10 ring-1 ring-electric/20" : "hover:bg-paper"}`}>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-[10px] font-extrabold uppercase text-electric-deep">{KIND_LABEL[item.kind].slice(0, 2)}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{item.title}</span><span className="block truncate text-[11.5px] text-steel">{KIND_LABEL[item.kind]} · {item.subtitle}</span></span>
                        <ArrowRight className="h-4 w-4 text-steel" />
                      </Link>
                    );
                  })}
                </div>
              ) : !loading && !error ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-7 text-center text-[13px] text-steel">Keine passenden Datensätze gefunden.</p>
              ) : null}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/70 px-4 py-2.5 text-[10.5px] text-steel">
          <span>↑↓ auswählen · Enter öffnen · Esc schließen</span>
          <span>⌘/Ctrl + K überall im Portal</span>
        </footer>
      </section>
    </div>
  );
}
