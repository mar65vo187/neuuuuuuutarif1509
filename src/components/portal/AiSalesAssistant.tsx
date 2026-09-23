"use client";

import { Bot, CheckCircle2, Copy, Loader2, RotateCcw, Send, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

type Mode = "coach" | "roleplay" | "debrief" | "objection" | "message" | "product" | "pitch";
type ThreadMessage = { role: "user" | "assistant"; content: string };

type AnswerMeta = {
  provider: "xkiro" | "gemini" | "openrouter";
  model: string;
  sources: string[];
  redactions: number;
  remaining: number;
};

const MODES: Array<{ key: Mode; label: string; hint: string }> = [
  { key: "coach", label: "Elite-Coach", hint: "Situation analysieren, Hebel finden, Formulierungen trainieren" },
  { key: "roleplay", label: "Rollenspiel", hint: "Realistische Kunden üben – inklusive schwieriger Einwände" },
  { key: "debrief", label: "Gespräch auswerten", hint: "Scorecard, Stärken, Schwächen und bessere Formulierungen" },
  { key: "objection", label: "Einwand", hint: "Einwand erst verstehen, dann gezielt und souverän lösen" },
  { key: "pitch", label: "Gesprächseinstieg", hint: "B2C/B2B-Opening mit Relevanz und guter erster Frage" },
  { key: "message", label: "Nachricht", hint: "WhatsApp/E-Mail menschlich und klar formulieren" },
  { key: "product", label: "Produktwissen", hint: "Produkte, Partner, Ablauf und Unterlagen sicher erklären" },
];

const STARTERS: Record<Mode, string[]> = {
  coach: [
    "Trainiere mich darin, Bedarf viel tiefer herauszufinden. Stell mir nacheinander Fragen.",
    "Ich rede zu viel im Kundengespräch. Zeig mir, wie ich besser führe und mehr herausfinde.",
    "Mach aus mir einen stärkeren Berater: Gib mir eine Übung für Discovery und Abschluss.",
  ],
  roleplay: [
    "Spiele einen skeptischen Privatkunden. Ich rufe wegen Internet und Mobilfunk an. Sei nicht zu leicht zu überzeugen.",
    "Spiele einen Geschäftskunden, der bereits mehrere Anbieter hat und keinen Wechselstress will.",
    "Spiele einen Kunden, der sagt: Ich will nur den günstigsten Preis und sonst nichts.",
  ],
  debrief: [
    "Ich beschreibe dir gleich mein letztes Kundengespräch. Bewerte mich streng und sag mir, was ich besser machen muss.",
    "Werte unseren bisherigen Rollenspiel-Verlauf aus und gib mir eine 1-10-Scorecard.",
  ],
  objection: [
    "Einwand: Ich möchte erst selbst vergleichen. Trainiere mich, den echten Grund herauszufinden.",
    "Einwand: Das ist mir zu teuer. Zeig mir erst die besten Rückfragen und dann eine Antwort.",
    "Einwand: Ich habe schon einen Ansprechpartner. Wie reagiere ich professionell?",
  ],
  message: [
    "Formuliere eine kurze Nachfass-Nachricht nach einem guten Erstgespräch.",
    "Schreibe eine sympathische WhatsApp nach einem verpassten Rückruf ohne Druck.",
  ],
  product: [
    "Welche Informationen sollte ich vor einer Produktempfehlung unbedingt klären?",
    "Erkläre mir ein passendes Produkt aus unserer Wissensbasis und prüfe mich danach mit 3 Fragen.",
  ],
  pitch: [
    "Wie erkläre ich TarifWerk in 20 Sekunden sympathisch und stark?",
    "Gib mir einen B2B-Gesprächseinstieg, der nicht nach Standard-Vertrieb klingt.",
  ],
};

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
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [meta, setMeta] = useState<AnswerMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const lastAssistant = [...thread].reverse().find((item) => item.role === "assistant");

  async function ask(event?: FormEvent, starter?: string) {
    event?.preventDefault();
    const value = (starter ?? question).trim();
    if (sending.current || value.length < 3) return;

    const history = thread.slice(-10);
    sending.current = true;
    setBusy(true);
    setError("");
    setCopied(false);
    setThread((current) => [...current, { role: "user" as const, content: value }]);
    setQuestion("");

    try {
      const response = await fetch("/api/portal/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, mode, audience, history }),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fassistent");
        return;
      }

      const json = await response.json().catch(() => null) as ({
        ok?: boolean;
        error?: string;
        text?: string;
      } & Partial<AnswerMeta>) | null;

      if (!response.ok || !json?.ok || typeof json.text !== "string") {
        throw new Error(json?.error ?? "Die KI konnte gerade nicht antworten.");
      }

      setThread((current) => [...current, { role: "assistant" as const, content: json.text! }].slice(-12));
      setMeta({
        provider: json.provider === "xkiro" ? "xkiro" : json.provider === "openrouter" ? "openrouter" : "gemini",
        model: String(json.model ?? ""),
        sources: Array.isArray(json.sources) ? json.sources.map(String) : [],
        redactions: Number(json.redactions ?? 0),
        remaining: Number(json.remaining ?? 0),
      });
    } catch (problem) {
      setThread((current) => current.slice(0, -1));
      if (problem instanceof DOMException && problem.name === "TimeoutError") {
        setError("Die KI hat länger als 60 Sekunden benötigt. Bitte erneut versuchen oder die Aufgabe etwas kürzer formulieren.");
      } else {
        setError(problem instanceof Error ? problem.message : "Die KI konnte gerade nicht antworten.");
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function resetTraining(nextMode?: Mode) {
    if (sending.current) return;
    setThread([]);
    setMeta(null);
    setError("");
    setCopied(false);
    setQuestion("");
    if (nextMode) setMode(nextMode);
  }

  async function copy() {
    if (!lastAssistant) return;
    try {
      await navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const roleplay = mode === "roleplay";

  return (
    <section className="overflow-hidden rounded-[28px] border border-electric/20 bg-[radial-gradient(circle_at_top_right,rgba(79,141,255,.20),transparent_38%),linear-gradient(145deg,rgba(14,29,53,.98),rgba(6,15,29,.98))] shadow-[0_28px_80px_-38px_rgba(0,0,0,.9)]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric text-white">{roleplay ? <Swords className="h-5 w-5" /> : <Bot className="h-5 w-5" />}</span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">Interne KI · TarifWerk Sales Academy</p>
              <h2 className="mt-1 text-[20px] font-extrabold text-white">KI-Vertriebscoach & Trainingspartner</h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-silver">Trainiert Discovery, Gesprächsführung, Einwände, Nutzenargumentation, Verhandlung, Follow-up und Abschluss – mit TarifWerk Produktwissen, Rollenspielen und konkretem Feedback.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-bold " + (configured ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.08] text-amber-200")}>
              <span className={"h-2 w-2 rounded-full " + (configured ? "bg-emerald-300" : "bg-amber-300")} /> {configured ? "KI konfiguriert" : "KI-Einrichtung fehlt"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] font-bold text-silver" title="Leads und Kundenakten werden nicht automatisch an die KI übermittelt. Deine Frage und der Verlauf gehen mit freigegebenem TarifWerk-Wissen an den konfigurierten Anbieter. Bitte Beispiele anonymisieren; E-Mail-Adressen und Telefonnummern werden vor dem Versand entfernt." aria-label="Kundenakten werden nicht automatisch an die KI übermittelt"><ShieldCheck className="h-3.5 w-3.5" /> Kundenakten getrennt</span>
            <button type="button" onClick={() => resetTraining()} disabled={busy} title="Aktuellen Verlauf verwerfen und neues Training starten" aria-label="Training neu starten; aktueller Verlauf wird verworfen" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] font-bold text-silver hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Training neu starten</button>
          </div>
        </div>
        {!configured && (
          <p role="status" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3.5 py-3 text-[11.5px] leading-relaxed text-amber-100">Der KI-Coach kann noch nicht antworten. Bitte den TarifWerk-Administrator informieren; für echte Antworten muss ein KI-Anbieter-Schlüssel sicher auf dem Server hinterlegt sein.</p>
        )}
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.82fr_1.18fr]">
        <form onSubmit={(event) => void ask(event)} className="space-y-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-silver">Trainingsmodus</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {MODES.map((item) => (
                <button key={item.key} type="button" onClick={() => { if (item.key !== mode) resetTraining(item.key); }} disabled={busy} aria-pressed={mode === item.key} className={"rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 " + (mode === item.key ? "border-electric/50 bg-electric/[0.11]" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]")}>
                  <p className="text-[11.5px] font-extrabold text-white">{item.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-silver">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => { setAudience("b2c"); resetTraining(); }} disabled={busy} className={"h-9 rounded-full border px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50 " + (audience === "b2c" ? "border-white bg-white text-ink" : "border-white/10 text-silver")}>Privat</button>
            <button type="button" onClick={() => { setAudience("b2b"); resetTraining(); }} disabled={busy} className={"h-9 rounded-full border px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50 " + (audience === "b2b" ? "border-champagne bg-champagne text-ink" : "border-white/10 text-silver")}>Business</button>
          </div>

          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-silver">{roleplay ? "Deine nächste Aussage im Rollenspiel" : "Frage / Trainingsaufgabe"}</span>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={5} maxLength={5000} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-[13px] leading-relaxed text-white outline-none placeholder:text-silver/50 focus:border-electric/50 focus:ring-2 focus:ring-electric/10" placeholder={roleplay ? "Übe mit einer anonymisierten Kundensituation. Für Feedback schreibe später: Stopp." : "Keine Kundennamen, E-Mail-Adressen oder Telefonnummern eingeben…"} />
            <span className="mt-2 block text-[10.5px] leading-relaxed text-silver/70">Deine Frage und der Verlauf werden mit freigegebenem TarifWerk-Wissen an den KI-Anbieter gesendet. Kundenakten werden nicht automatisch angehängt. Bitte Namen und weitere Angaben anonymisieren; E-Mail-Adressen und Telefonnummern werden vor dem Versand entfernt.</span>
          </label>

          {thread.length === 0 && <div className="flex flex-wrap gap-1.5">
            {STARTERS[mode].map((starter) => <button key={starter} type="button" onClick={() => void ask(undefined, starter)} className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[10px] font-semibold text-silver hover:bg-white/[0.07] hover:text-white">{starter}</button>)}
          </div>}

          {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-[12px] text-red-200">{error}</p>}

          <button type="submit" disabled={!configured || busy || question.trim().length < 3} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-45">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {busy ? "Coach arbeitet…" : roleplay ? "Im Rollenspiel antworten" : "Coach fragen"}
          </button>
          <p className="text-[10.5px] leading-relaxed text-silver/70">Interner Nutzungsschutz: maximal {dailyLimit} erfolgreiche Antworten pro Mitarbeiter und Tag. {trainingIncluded ? "Sales-Playbook und freigegebene Schulungsinhalte sind aktiv." : "Das feste Sales-Playbook ist aktiv; zusätzliche Schulungsmodule sind derzeit deaktiviert."}</p>
        </form>

        <div className="min-h-[460px] rounded-[22px] border border-white/8 bg-black/20 p-4 sm:p-5">
          {thread.length > 0 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-electric-soft"><Sparkles className="h-3.5 w-3.5" /> {roleplay ? "Live-Rollenspiel" : "Coaching-Verlauf"}</p>
                  {meta && <p className="mt-1 text-[10px] text-silver">{meta.provider} · {meta.model} · heute noch {meta.remaining}</p>}
                </div>
                <button type="button" onClick={copy} disabled={!lastAssistant} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[10.5px] font-bold text-silver hover:bg-white/8 hover:text-white disabled:opacity-40">{copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Kopiert" : "Letzte Antwort kopieren"}</button>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto py-4 pr-1">
                {thread.map((item, index) => (
                  <div key={index} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className={item.role === "user"
                      ? "max-w-[88%] rounded-2xl rounded-br-md bg-electric px-4 py-3 text-[12.5px] leading-6 text-white"
                      : "max-w-[94%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.045] px-4 py-3 text-[12.5px] leading-6 text-platinum"
                    }>
                      <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] opacity-60">{item.role === "user" ? "Du" : roleplay ? "Kunde / Coach" : "KI-Coach"}</p>
                      <p className="whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                ))}
                {busy && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 text-[11px] text-silver"><Loader2 className="h-4 w-4 animate-spin" /> Analysiere…</div></div>}
              </div>

              {meta && meta.redactions > 0 && <p className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[10.5px] text-amber-100">{meta.redactions} mögliche personenbezogene Angabe(n) wurden vor der KI-Anfrage automatisch entfernt.</p>}
              {meta && meta.sources.length > 0 && <div className="border-t border-white/8 pt-3"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-silver">Verwendete Wissensquellen</p><div className="mt-2 flex flex-wrap gap-1.5">{meta.sources.map((source) => <span key={source} className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[9.5px] text-silver">{source}</span>)}</div></div>}
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-electric/20 bg-electric/10 text-electric-soft"><Swords className="h-6 w-6" /></span>
                <h3 className="mt-4 text-[16px] font-extrabold text-white">Deine interne TarifWerk Sales Academy</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-silver">Trainiere echte Gesprächssituationen statt nur Antworten abzuholen. Der Coach verbindet TarifWerk-Wissen mit Discovery, Einwanddiagnose, Nutzenargumentation, Verhandlung, Follow-up und Abschluss.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
