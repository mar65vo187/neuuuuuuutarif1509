"use client";

import { Bot, CheckCircle2, Copy, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

type Mode = "coach" | "objection" | "message" | "product" | "pitch";

type Answer = {
  text: string;
  provider: "gemini" | "openrouter";
  model: string;
  sources: string[];
  redactions: number;
  remaining: number;
};

const MODES: Array<{ key: Mode; label: string; hint: string }> = [
  { key: "coach", label: "Vertriebscoach", hint: "Gespräch strukturieren & nächsten Schritt finden" },
  { key: "objection", label: "Einwand", hint: "Einwände ruhig und überzeugend beantworten" },
  { key: "message", label: "Nachricht", hint: "WhatsApp/E-Mail menschlich formulieren" },
  { key: "product", label: "Produktwissen", hint: "Produkte, Partner, Ablauf und Unterlagen erklären" },
  { key: "pitch", label: "Gesprächseinstieg", hint: "Kurzen B2C- oder B2B-Pitch erstellen" },
];

const STARTERS = [
  "Wie erkläre ich TarifWerk in 20 Sekunden sympathisch?",
  "Was sage ich bei dem Einwand: Ich möchte erst selbst vergleichen?",
  "Formuliere eine kurze Nachfass-Nachricht nach einem guten Erstgespräch.",
  "Wie strukturiere ich eine Bedarfsermittlung, ohne direkt auf ein Produkt zu springen?",
];

export function AiSalesAssistant({
  configured,
  dailyLimit,
  trainingIncluded,
}: {
  configured: boolean;
  dailyLimit: number;
  trainingIncluded: boolean;
}) {
  const sending = useRef(false);
  const [mode, setMode] = useState<Mode>("coach");
  const [audience, setAudience] = useState<"b2c" | "b2b">("b2c");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    if (sending.current || question.trim().length < 3) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/portal/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), mode, audience }),
        signal: AbortSignal.timeout(35_000),
      });
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fassistent");
        return;
      }
      const json = await response.json().catch(() => null) as ({ ok?: boolean; error?: string } & Partial<Answer>) | null;
      if (!response.ok || !json?.ok || typeof json.text !== "string") {
        throw new Error(json?.error ?? "Die KI konnte gerade nicht antworten.");
      }
      setAnswer({
        text: json.text,
        provider: json.provider === "openrouter" ? "openrouter" : "gemini",
        model: String(json.model ?? ""),
        sources: Array.isArray(json.sources) ? json.sources.map(String) : [],
        redactions: Number(json.redactions ?? 0),
        remaining: Number(json.remaining ?? 0),
      });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Die KI konnte gerade nicht antworten.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function copy() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-electric/20 bg-[radial-gradient(circle_at_top_right,rgba(79,141,255,.20),transparent_38%),linear-gradient(145deg,rgba(14,29,53,.98),rgba(6,15,29,.98))] shadow-[0_28px_80px_-38px_rgba(0,0,0,.9)]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">Echte KI · TarifWerk Wissensbasis</p>
              <h2 className="mt-1 text-[20px] font-extrabold text-white">KI-Vertriebsassistent</h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-silver">Nutzt freigegebenes Unternehmens-, Produkt-, Partner- und Vertriebswissen. Antworten sollen TarifWerk stark positionieren, bleiben aber an hinterlegte Fakten gebunden.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-bold " + (configured ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.08] text-amber-200")}>
              <span className={"h-2 w-2 rounded-full " + (configured ? "bg-emerald-300" : "bg-amber-300")} /> {configured ? "KI bereit" : "API-Key fehlt"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] font-bold text-silver"><ShieldCheck className="h-3.5 w-3.5" /> Keine CRM-PII</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={ask} className="space-y-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-silver">Arbeitsmodus</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {MODES.map((item) => (
                <button key={item.key} type="button" onClick={() => setMode(item.key)} aria-pressed={mode === item.key} className={"rounded-xl border p-3 text-left transition " + (mode === item.key ? "border-electric/50 bg-electric/[0.11]" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]")}>
                  <p className="text-[11.5px] font-extrabold text-white">{item.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-silver">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setAudience("b2c")} className={"h-9 rounded-full border px-3 text-[11px] font-bold " + (audience === "b2c" ? "border-white bg-white text-ink" : "border-white/10 text-silver")}>Privat</button>
            <button type="button" onClick={() => setAudience("b2b")} className={"h-9 rounded-full border px-3 text-[11px] font-bold " + (audience === "b2b" ? "border-champagne bg-champagne text-ink" : "border-white/10 text-silver")}>Business</button>
          </div>

          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-silver">Frage / Aufgabe</span>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={6} maxLength={5000} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-[13px] leading-relaxed text-white outline-none placeholder:text-silver/50 focus:border-electric/50 focus:ring-2 focus:ring-electric/10" placeholder="Keine Kundennamen, E-Mail-Adressen oder Telefonnummern eingeben…" />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => setQuestion(starter)} className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[10px] font-semibold text-silver hover:bg-white/[0.07] hover:text-white">{starter}</button>)}
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-[12px] text-red-200">{error}</p>}

          <button type="submit" disabled={!configured || busy || question.trim().length < 3} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-45">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {busy ? "KI arbeitet…" : "KI fragen"}
          </button>
          <p className="text-[10.5px] leading-relaxed text-silver/70">Free-Tier-Schutz: maximal {dailyLimit} erfolgreiche Antworten pro Mitarbeiter und Tag. {trainingIncluded ? "Freigegebene Schulungsinhalte sind einbezogen." : "Schulungs-Volltexte werden standardmäßig nicht an externe Free-Modelle gesendet."}</p>
        </form>

        <div className="min-h-[420px] rounded-[22px] border border-white/8 bg-black/20 p-4 sm:p-5">
          {answer ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
                <div><p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-electric-soft"><Sparkles className="h-3.5 w-3.5" /> KI-Antwort</p><p className="mt-1 text-[10px] text-silver">{answer.provider} · {answer.model} · heute noch {answer.remaining}</p></div>
                <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[10.5px] font-bold text-silver hover:bg-white/8 hover:text-white">{copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Kopiert" : "Kopieren"}</button>
              </div>
              <div className="whitespace-pre-wrap py-4 text-[13.5px] leading-7 text-platinum">{answer.text}</div>
              {answer.redactions > 0 && <p className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[10.5px] text-amber-100">{answer.redactions} mögliche personenbezogene Angabe(n) wurden vor der KI-Anfrage automatisch entfernt.</p>}
              {answer.sources.length > 0 && <div className="border-t border-white/8 pt-3"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-silver">Verwendete Wissensquellen</p><div className="mt-2 flex flex-wrap gap-1.5">{answer.sources.map((source) => <span key={source} className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[9.5px] text-silver">{source}</span>)}</div></div>}
            </div>
          ) : (
            <div className="grid min-h-[380px] place-items-center text-center">
              <div className="max-w-md"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-electric/20 bg-electric/10 text-electric-soft"><Bot className="h-6 w-6" /></span><h3 className="mt-4 text-[16px] font-extrabold text-white">Dein TarifWerk Wissens-Coach</h3><p className="mt-2 text-[12px] leading-relaxed text-silver">Frage nach Gesprächsführung, Einwänden, Produkten, Partnern, Checklisten oder Formulierungen. Der Assistent nutzt die im Backoffice gepflegte Wissensbasis statt frei Unternehmensfakten zu erfinden.</p></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
