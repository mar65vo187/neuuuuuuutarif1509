"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, KeyRound, Layers3, Loader2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        credentials: "same-origin",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(mfaRequired && mfaCode ? { mfaCode } : {}) }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; mfaRequired?: boolean };
      if (json.mfaRequired) {
        setMfaRequired(true);
        if (!res.ok && res.status !== 202) setError(json.error ?? "2FA-Code prüfen.");
        return;
      }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      let destination = "/portal";
      if (next) {
        try {
          const target = new URL(next, window.location.origin);
          if (target.origin === window.location.origin &&
              (target.pathname === "/portal" || target.pathname.startsWith("/portal/")) &&
              target.pathname !== "/portal/login" && !target.pathname.startsWith("/portal/login/")) {
            destination = target.pathname + target.search + target.hash;
          }
        } catch { }
      }
      window.location.replace(destination);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-5 py-12 text-white grain">
      <div className="absolute inset-0 grid-lines" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-electric/20 blur-[140px]" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-5xl">
        <div className="mb-7 flex items-center justify-center lg:justify-start"><Logo size={40} /><div className="ml-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-electric-soft">TarifWerk</p><p className="text-[12px] font-semibold text-silver">Mitarbeiterportal</p></div></div>
        <div className="grid overflow-hidden rounded-[30px] border border-white/10 bg-[#081426]/88 shadow-[0_36px_100px_-34px_rgba(0,0,0,0.85)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[560px] overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_20%_10%,rgba(79,141,255,0.24),transparent_35%),linear-gradient(145deg,#0b1a31,#07111f)] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-champagne/10 blur-[90px]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-electric/25 bg-electric/10 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-electric-soft"><Layers3 className="h-3.5 w-3.5" /> Arbeitsbereich</span>
              <h2 className="mt-7 max-w-md text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">Weniger suchen.<br />Sauberer arbeiten.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-7 text-silver">Leads, Kunden, Aufträge, Aufgaben und Wissen in einer klaren Arbeitsoberfläche – mit Fokus auf Nachvollziehbarkeit und Beratungsqualität.</p>
            </div>
            <div className="relative grid gap-3">
              {[
                ["Leads & Kunden", "Nächste Schritte und Kundenhistorie im Blick.", CheckCircle2],
                ["Aufgaben & Wiedervorlagen", "Offene Arbeit wird sichtbar, bevor etwas liegen bleibt.", Layers3],
                ["Geschützter Teamzugang", "Rollen, Sitzungen und Zwei-Faktor-Schutz für sensible Bereiche.", ShieldCheck],
              ].map(([title, text, Icon]) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return <div key={String(title)} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.045] p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric-soft"><ItemIcon className="h-4 w-4" /></span><div><p className="text-[12.5px] font-extrabold text-white">{String(title)}</p><p className="mt-0.5 text-[11.5px] leading-relaxed text-silver">{String(text)}</p></div></div>;
              })}
            </div>
          </section>
          <section className="p-7 sm:p-10 lg:p-12">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-electric/20 bg-electric/10 text-electric-soft">{mfaRequired ? <KeyRound className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}</span>
              <div><h1 className="text-[24px] font-extrabold">Mitarbeiter-Login</h1><p className="text-[13px] text-silver">{mfaRequired ? "Zwei-Faktor-Bestätigung" : "Sicher im TarifWerk-Portal anmelden"}</p></div>
            </div>
            <form onSubmit={submit} className="mt-8 grid gap-4">
              <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-platinum">E-Mail</label><input id="email" type="email" className="field-dark" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required disabled={mfaRequired} /></div>
              <div><label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-platinum">Passwort</label><input id="password" type="password" className="field-dark" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={mfaRequired} /></div>
              {mfaRequired && <div><label htmlFor="mfa" className="mb-1.5 block text-[13px] font-semibold text-platinum">Authenticator-Code</label><input id="mfa" className="field-dark text-center tracking-[0.35em]" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} autoFocus /></div>}
              {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300">{error}</p>}
              <button type="submit" disabled={loading || (mfaRequired && mfaCode.length !== 6)} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-electric font-extrabold text-white transition-colors hover:bg-electric-deep disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{loading ? "Prüfen…" : mfaRequired ? "Code bestätigen" : "Sicher anmelden"}{!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              {mfaRequired && <button type="button" className="text-[12.5px] text-silver hover:text-white" onClick={() => { setMfaRequired(false); setMfaCode(""); setError(null); }}>Andere Zugangsdaten verwenden</button>}
            </form>
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.035] p-3 text-[10.5px] leading-relaxed text-silver"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric-soft" />Nutze deinen persönlichen Zugang. Zugangsdaten dürfen nicht mit anderen Personen geteilt werden.</div>
          </section>
        </div>
        <p className="mt-6 text-center text-[13px] text-steel lg:text-left"><Link href="/" className="hover:text-white">← Zurück zur Website</Link></p>
      </motion.div>
    </main>
  );
}
