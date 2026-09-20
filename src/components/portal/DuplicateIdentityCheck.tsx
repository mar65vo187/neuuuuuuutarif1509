"use client";

import { AlertTriangle, Search, ShieldCheck, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Match = {
  entity: "lead" | "customer";
  id: number;
  label: string;
  subtitle: string;
  ownerName: string | null;
  teamNames: string[];
  href: string;
  reason: string;
  strongDuplicate: boolean;
  createdAt: string;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function DuplicateIdentityCheck({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone: string;
}) {
  const query = useMemo(() => {
    const cleanEmail = email.trim();
    const cleanPhone = digits(phone);
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanEmail.length >= 3) return cleanEmail;
    if (cleanPhone.length >= 4) return cleanPhone;
    if (cleanName.length >= 2) return cleanName;
    return "";
  }, [name, email, phone]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [scope, setScope] = useState<"global" | "own">("own");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch("/api/portal/identity-search?q=" + encodeURIComponent(query), {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Suche fehlgeschlagen");
        const body = await response.json() as { ok?: boolean; scope?: "global" | "own"; matches?: Match[] };
        if (!body.ok) throw new Error("Suche fehlgeschlagen");
        setScope(body.scope === "global" ? "global" : "own");
        setMatches(Array.isArray(body.matches) ? body.matches : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMatches([]);
        setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  if (!query) {
    return (
      <div className="rounded-2xl border border-line bg-paper/60 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric-deep"><UserRoundSearch className="h-4 w-4" /></span>
          <div>
            <p className="text-[12.5px] font-extrabold text-ink">Duplikatcheck</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-steel">Sobald Name, E-Mail oder Telefonnummer eingetragen wird, prüft das CRM automatisch auf bestehende Kontakte.</p>
          </div>
        </div>
      </div>
    );
  }

  const strong = matches.some((match) => match.strongDuplicate);

  return (
    <div className={"rounded-2xl border p-4 " + (strong ? "border-red-300/50 bg-red-500/[0.07]" : matches.length ? "border-amber-300/30 bg-amber-400/[0.06]" : "border-emerald-300/25 bg-emerald-400/[0.05]")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (strong ? "bg-red-500/10 text-red-500" : matches.length ? "bg-amber-400/10 text-amber-600" : "bg-emerald-400/10 text-emerald-600")}>
            {strong ? <AlertTriangle className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[12.5px] font-extrabold text-ink">{strong ? "Starkes Duplikat-Signal" : matches.length ? "Ähnliche Datensätze gefunden" : loading ? "CRM wird geprüft …" : "Kein sichtbarer Treffer"}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-steel">
              {scope === "global"
                ? "Admin-Sicht: Treffer aus allen Teams werden angezeigt."
                : "Mitarbeiter-Sicht: Es werden ausschließlich deine eigenen Leads und Kunden angezeigt."}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1 text-[10px] font-bold text-steel"><ShieldCheck className="h-3 w-3" /> {scope === "global" ? "Alle Teams" : "Nur eigene Daten"}</span>
      </div>

      {failed && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">Die Vorschau konnte gerade nicht geladen werden. Der serverseitige Duplikatschutz bleibt beim Speichern trotzdem aktiv.</p>}

      {!loading && matches.length > 0 && (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {matches.map((match) => (
            <Link key={match.entity + ":" + match.id} href={match.href} className={"block rounded-xl border p-3 transition hover:border-electric/35 " + (match.strongDuplicate ? "border-red-300/40 bg-red-500/[0.05]" : "border-line bg-white/70")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12.5px] font-extrabold text-ink">{match.label}</p>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-steel">{match.entity === "lead" ? "Lead" : "Kunde"}</span>
                    {match.strongDuplicate && <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[9.5px] font-extrabold text-red-700">Exakter Kontakt</span>}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-steel">{match.subtitle || "Keine weiteren Kontaktdaten"}</p>
                  <p className="mt-1 text-[10.5px] font-semibold text-steel">Treffer: {match.reason}</p>
                </div>
                <div className="text-right text-[10.5px] text-steel">
                  {scope === "global" && <><p className="font-bold text-ink">{match.ownerName || "Ohne Verantwortlichen"}</p><p className="mt-0.5">{match.teamNames.length ? match.teamNames.join(", ") : "Kein Team"}</p></>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
