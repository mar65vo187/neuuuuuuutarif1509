"use client";

import { CheckCircle2, Loader2, LogOut, MonitorSmartphone, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type SessionRow = {
  id: number;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  mfaVerified: boolean;
  userAgent: string | null;
  current: boolean;
};

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unbekanntes Gerät";
  const browser = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Android/i.test(userAgent)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(userAgent)
        ? "iOS"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
}

export function SessionSecurityPanel({
  initialSessions,
}: {
  initialSessions: SessionRow[];
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revokeOthers() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/portal/security/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_others" }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; revoked?: number } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Sitzungen konnten nicht abgemeldet werden.");
      setSessions((rows) => rows.filter((row) => row.current));
      setMessage((json.revoked ?? 0) > 0
        ? String(json.revoked) + " andere Sitzung(en) wurden abgemeldet."
        : "Es waren keine weiteren aktiven Sitzungen vorhanden.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Sitzungen konnten nicht abgemeldet werden.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const otherSessions = sessions.filter((row) => !row.current).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><MonitorSmartphone className="h-4.5 w-4.5 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Aktive Sitzungen</h2></div>
          <p className="mt-1 text-[12px] text-steel">Sitzungen enden nach 60 Minuten Inaktivität und spätestens nach 12 Stunden.</p>
        </div>
        <button
          type="button"
          onClick={revokeOthers}
          disabled={busy || otherSessions === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-bold hover:border-red-300 hover:text-red-600 disabled:opacity-45"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Andere Geräte abmelden
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {sessions.map((session) => (
          <div key={session.id} className={"rounded-2xl border p-4 " + (session.current ? "border-electric/25 bg-electric/[0.06]" : "border-line bg-paper/50")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (session.mfaVerified ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                  {session.mfaVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-[12.5px] font-extrabold">{deviceLabel(session.userAgent)} {session.current && <span className="ml-1 text-electric-deep">· Dieses Gerät</span>}</p>
                  <p className="mt-0.5 text-[10.5px] text-steel">Zuletzt aktiv: {new Date(session.lastSeenAt).toLocaleString("de-DE")}</p>
                  <p className="mt-0.5 text-[10.5px] text-steel">Maximal bis: {new Date(session.expiresAt).toLocaleString("de-DE")}</p>
                </div>
              </div>
              <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold " + (session.mfaVerified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                {session.mfaVerified ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {session.mfaVerified ? "2FA bestätigt" : "Nur Passwort"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {message && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
    </div>
  );
}
