"use client";

import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Lock } from "lucide-react";
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
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size={40} /></div>
        <div className="glass rounded-[28px] p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-electric/15 text-electric-soft">{mfaRequired ? <KeyRound className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}</span>
            <div><h1 className="text-[22px] font-extrabold">Mitarbeiter-Login</h1><p className="text-[13px] text-silver">{mfaRequired ? "Zwei-Faktor-Bestätigung" : "Nur für das TarifWerk-Team"}</p></div>
          </div>
          <form onSubmit={submit} className="mt-7 grid gap-4">
            <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-platinum">E-Mail</label><input id="email" type="email" className="field-dark" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required disabled={mfaRequired} /></div>
            <div><label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-platinum">Passwort</label><input id="password" type="password" className="field-dark" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={mfaRequired} /></div>
            {mfaRequired && <div><label htmlFor="mfa" className="mb-1.5 block text-[13px] font-semibold text-platinum">Authenticator-Code</label><input id="mfa" className="field-dark text-center tracking-[0.35em]" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} autoFocus /></div>}
            {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300">{error}</p>}
            <button type="submit" disabled={loading || (mfaRequired && mfaCode.length !== 6)} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-electric font-semibold text-white transition-colors hover:bg-electric-deep disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{loading ? "Prüfen…" : mfaRequired ? "Code bestätigen" : "Anmelden"}{!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            {mfaRequired && <button type="button" className="text-[12.5px] text-silver hover:text-white" onClick={() => { setMfaRequired(false); setMfaCode(""); setError(null); }}>Andere Zugangsdaten verwenden</button>}
          </form>
        </div>
        <p className="mt-6 text-center text-[13px] text-steel"><Link href="/" className="hover:text-white">← Zurück zur Website</Link></p>
      </motion.div>
    </main>
  );
}
