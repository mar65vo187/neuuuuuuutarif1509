"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Copy, Loader2, Share2 } from "lucide-react";

type Links = { shareUrl: string; dashboardUrl: string };
type Status = { code: string; referralCount: number; qualifiedCount: number; completedCount: number; benefit: { friend: string | null; referrer: string | null } };
const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-50";

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error ?? "Die Anfrage konnte nicht verarbeitet werden.");
  return body as T;
}

export function ShareLinks({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Empfehlungslink kopiert."); }
    catch { input.current?.focus(); input.current?.select(); setMessage("Bitte kopiere den markierten Link."); }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "TarifWerk – Beratung auf Augenhöhe", text: "Vielleicht hilft dir eine persönliche Einschätzung von TarifWerk.", url });
      else await copy();
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Teilen ist gerade nicht möglich. Du kannst den Link kopieren."); }
  }
  const text = encodeURIComponent(`Vielleicht hilft dir eine persönliche Einschätzung von TarifWerk: ${url}`);
  return <div className="space-y-4">
    <label className="label">Dein Link zum Weitergeben<input ref={input} className="field mt-2" readOnly value={url} onFocus={(event) => event.target.select()} /></label>
    <div className="flex flex-wrap gap-3">
      <button className={button} type="button" onClick={copy}><Copy className="h-4 w-4" /> Link kopieren</button>
      <button className={button} type="button" onClick={share}><Share2 className="h-4 w-4" /> Teilen</button>
      <a className="inline-flex min-h-12 items-center text-[14px] font-semibold text-electric-deep" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="inline-flex min-h-12 items-center text-[14px] font-semibold text-electric-deep" href={`mailto:?subject=${encodeURIComponent("Eine Empfehlung für dich")}&body=${text}`}>E-Mail</a>
    </div>
    {message && <p className="text-[14px] text-steel" role="status">{message}</p>}
  </div>;
}

export function ReferralRegistration() {
  const [links, setLinks] = useState<Links | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending.current) return;
    const values = new FormData(event.currentTarget);
    sending.current = true; setBusy(true); setError("");
    try {
      const result = await readResponse<Links>(await fetch("/api/referrals", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ name: values.get("name"), email: values.get("email"), consent: values.get("consent") === "on" }),
      }));
      setLinks({ shareUrl: new URL(result.shareUrl, window.location.origin).href, dashboardUrl: new URL(result.dashboardUrl, window.location.origin).href });
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Bitte versuche es erneut."); }
    finally { sending.current = false; setBusy(false); }
  }
  if (links) return <div className="space-y-6">
    <h2 className="flex items-center gap-2 text-[22px] font-extrabold text-ink"><Check className="h-5 w-5 text-electric-deep" /> Dein Empfehlungslink ist bereit.</h2>
    <ShareLinks url={links.shareUrl} />
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="font-semibold text-ink">Diesen zweiten Link behältst du für dich.</p>
      <p className="mt-2 text-[14px] leading-relaxed text-steel">Dein Status-Link zeigt nur zusammengefasste Zahlen. Jeder mit diesem Link kann sie sehen. Speichere ihn als Lesezeichen; er wird nicht per E-Mail versendet.</p>
      <a href={links.dashboardUrl} className="mt-4 inline-flex min-h-12 items-center gap-2 font-semibold text-electric-deep">Privaten Status öffnen <ArrowRight className="h-4 w-4" /></a>
    </div>
  </div>;
  return <form onSubmit={submit} className="space-y-5">
    <h2 className="text-[22px] font-extrabold text-ink">Deinen persönlichen Link erstellen</h2>
    <p className="text-[15px] leading-relaxed text-steel">Du gibst nur deine eigenen Daten an. Deine Freunde entscheiden selbst, ob sie sich bei uns melden.</p>
    <label className="label">Dein Name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="field mt-2" disabled={busy} /></label>
    <label className="label">Deine E-Mail<input name="email" type="email" required maxLength={200} autoComplete="email" className="field mt-2" disabled={busy} /></label>
    <label className="flex items-start gap-3 text-[14px] leading-relaxed text-steel"><input type="checkbox" name="consent" required disabled={busy} className="mt-1" /><span>TarifWerk darf meine Angaben zur Zuordnung meiner Empfehlungen und zur Kontaktaufnahme dazu verwenden. Kein Newsletter. <Link href="/datenschutz" className="underline">Datenschutz</Link></span></label>
    {error && <p role="alert" className="text-[14px] text-red-700">{error}</p>}
    <button type="submit" className={button} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Empfehlungslink erstellen</button>
  </form>;
}

export function ReferralDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const request = useRef<AbortController | null>(null);
  async function load() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const token = window.location.hash.slice(1);
    if (!/^[a-f0-9]{64}$/.test(token)) { setError("Öffne den vollständigen privaten Status-Link, den du beim Erstellen erhalten hast."); setBusy(false); return; }
    setBusy(true); setError("");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const data = await readResponse<Status>(await fetch("/api/referrals/status", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal }));
      if (request.current !== controller) return;
      setStatus(data); setShareUrl(`${window.location.origin}/freund-werben?ref=${data.code}`);
    } catch (problem) {
      if (request.current === controller) setError(controller.signal.aborted ? "Der Abruf dauert zu lange. Bitte erneut versuchen." : problem instanceof Error ? problem.message : "Status nicht erreichbar.");
    } finally { clearTimeout(timeout); if (request.current === controller) setBusy(false); }
  }
  useEffect(() => {
    const first = setTimeout(() => { void load(); }, 0);
    const changed = () => { setStatus(null); void load(); };
    window.addEventListener("hashchange", changed);
    return () => { clearTimeout(first); request.current?.abort(); request.current = null; window.removeEventListener("hashchange", changed); };
  }, []);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-[24px] font-extrabold text-ink">Deine Empfehlungen im Blick</h2><button type="button" disabled={busy} onClick={load} className={button}>{busy ? "Wird geladen …" : "Aktualisieren"}</button></div>
    {error && <p role="alert" className="rounded-xl border border-line bg-paper p-4 text-[14px] text-steel">{error}</p>}
    {status && <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Anfragen", status.referralCount], ["Termin oder Beratung", status.qualifiedCount], ["Abgeschlossen", status.completedCount]].map(([label, value]) => <div key={label} className="rounded-2xl border border-line bg-paper p-5"><p className="text-[32px] font-extrabold text-ink">{value}</p><p className="mt-1 text-[14px] text-steel">{label}</p></div>)}
      </div>
      <p className="text-[14px] leading-relaxed text-steel">Gezählt werden neue Kontakte, die über deinen Link anfragen und der Zuordnung zustimmen. Mehrere Anfragen derselben E-Mail werden einmal gezählt. „Abgeschlossen“ ist ein Bearbeitungsstatus und keine Prämienfreigabe.</p>
      {status.benefit.referrer && <p className="rounded-2xl bg-paper p-5 text-[15px] text-ink">Für dich: {status.benefit.referrer}</p>}
      <ShareLinks url={shareUrl} />
    </>}
    <p className="text-[14px] leading-relaxed text-steel">Keine Namen, Kontaktdaten oder Vertragsdetails deiner Freunde werden hier angezeigt. Deinen privaten Status-Link bitte nicht weitergeben.</p>
  </div>;
}
