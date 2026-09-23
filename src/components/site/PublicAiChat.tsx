"use client";

import { Bot, ChevronRight, Loader2, MessageCircle, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { withAudience, type AudienceMode } from "@/lib/audience";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTERS: Record<AudienceMode, string[]> = {
  b2c: [
    "Wobei könnt ihr mir helfen?",
    "Lohnt sich ein Tarifcheck für mich?",
    "Wie läuft eine kostenlose Einschätzung ab?",
    "Ich habe schon ein Angebot – könnt ihr eine zweite Meinung geben?",
  ],
  b2b: [
    "Welche Themen könnt ihr für Unternehmen bündeln?",
    "Wie läuft eine Business-Bedarfsklärung ab?",
    "Könnt ihr mehrere Standorte berücksichtigen?",
    "Wie hilft TarifWerk bei bestehenden Verträgen?",
  ],
};

function initialMessage(audience: AudienceMode): ChatMessage {
  return {
    role: "assistant",
    content: audience === "b2b"
      ? "Hallo! Ich bin der digitale TarifWerk KI-Berater. Was möchten Sie für Ihr Unternehmen gerade einfacher, günstiger oder übersichtlicher lösen?"
      : "Hi! Ich bin der digitale TarifWerk KI-Berater. Worum geht es bei dir gerade – Vertrag, Energie, Absicherung, Zuhause oder etwas ganz anderes?",
  };
}

export function PublicAiChat({ audience }: { audience: AudienceMode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [initialMessage(audience)]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [redactions, setRedactions] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest" }));
  }, [messages, open, busy]);

  async function send(text: string) {
    const value = text.trim();
    if (sending.current || value.length < 2) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user" as const, content: value }].slice(-10);
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError("");
    setRedactions(0);
    sending.current = true;
    try {
      const response = await fetch("/api/public-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          audience,
          pagePath: pathname,
        }),
        signal: AbortSignal.timeout(55_000),
      });
      const json = await response.json().catch(() => null) as {
        ok?: boolean;
        text?: string;
        error?: string;
        redactions?: number;
      } | null;
      if (!response.ok || !json?.ok || typeof json.text !== "string") {
        throw new Error(json?.error ?? "Der KI-Berater konnte gerade nicht antworten.");
      }
      setMessages((current) => [...current, { role: "assistant" as const, content: json.text! }].slice(-10));
      setRedactions(Number(json.redactions ?? 0));
    } catch (problem) {
      if (problem instanceof DOMException && problem.name === "TimeoutError") {
        setError("Die Antwort dauert gerade zu lange. Bitte versuche es noch einmal.");
      } else {
        setError(problem instanceof Error ? problem.message : "Der KI-Berater konnte gerade nicht antworten.");
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="TarifWerk KI-Berater"
          className="fixed bottom-[88px] right-3 z-[70] flex max-h-[min(690px,calc(100dvh-120px))] w-[min(410px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[26px] border border-white/12 bg-[#071324]/98 text-white shadow-[0_30px_90px_-24px_rgba(0,0,0,.9)] backdrop-blur-xl md:bottom-24 md:right-6"
        >
          <header className="flex items-center gap-3 border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(79,141,255,.24),transparent_42%)] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-electric text-white"><Bot className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">TarifWerk · digitaler KI-Berater</p>
              <p className="mt-0.5 text-[13px] font-bold">Schnell klären, was für dich Sinn ergibt.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-silver hover:bg-white/8 hover:text-white" aria-label="KI-Berater schließen"><X className="h-4.5 w-4.5" /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.role === "user"
                    ? "max-w-[86%] rounded-2xl rounded-br-md bg-electric px-3.5 py-3 text-[12.5px] leading-relaxed text-white"
                    : "max-w-[92%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.055] px-3.5 py-3 text-[12.5px] leading-relaxed text-platinum"
                  }>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.055] px-3.5 py-3 text-[12px] text-silver"><Loader2 className="h-4 w-4 animate-spin text-electric-soft" /> Ich denke kurz nach…</div></div>}
              <div ref={endRef} />
            </div>

            {messages.length <= 2 && !busy && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {STARTERS[audience].map((starter) => (
                  <button key={starter} type="button" onClick={() => void send(starter)} className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-left text-[10px] font-semibold text-silver transition hover:border-electric/35 hover:bg-electric/10 hover:text-white">
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {redactions > 0 && <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[10px] leading-relaxed text-amber-100">Zum Datenschutz wurden mögliche Kontaktangaben vor der KI-Anfrage automatisch entfernt.</p>}
            {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[11px] text-red-200">{error}</p>}
          </div>

          <div className="border-t border-white/10 p-3.5">
            <form onSubmit={submit} className="flex gap-2">
              <label className="sr-only" htmlFor="public-ai-message">Nachricht an den KI-Berater</label>
              <input
                id="public-ai-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1800}
                placeholder={audience === "b2b" ? "Ihre Frage an TarifWerk…" : "Deine Frage an TarifWerk…"}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3.5 text-[12px] text-white outline-none placeholder:text-silver/55 focus:border-electric/45 focus:ring-2 focus:ring-electric/10"
              />
              <button type="submit" disabled={busy || input.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-electric text-white hover:bg-electric-deep disabled:opacity-40" aria-label="Nachricht senden"><Send className="h-4 w-4" /></button>
            </form>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-[9.5px] leading-relaxed text-silver/65"><ShieldCheck className="h-3 w-3" /> Keine persönlichen Daten im Chat teilen.</p>
              <Link href={withAudience("/anfrage", audience)} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-electric-soft hover:text-white">Persönlich beraten lassen <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[76px] right-3 z-[69] inline-flex h-12 items-center gap-2 rounded-full border border-electric/30 bg-ink-800 px-3.5 text-[11px] font-extrabold text-white shadow-[0_16px_44px_-16px_rgba(79,141,255,.7)] transition hover:-translate-y-0.5 hover:border-electric/60 md:bottom-24 md:right-6 md:h-13 md:px-4"
        aria-expanded={open}
        aria-label={open ? "TarifWerk KI-Berater schließen" : "TarifWerk KI-Berater öffnen"}
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-electric text-white"><Sparkles className="h-3.5 w-3.5" /></span>
        <span className="hidden sm:inline">{open ? "Chat schließen" : "KI-Berater fragen"}</span>
        <MessageCircle className="h-4 w-4 sm:hidden" />
      </button>
    </>
  );
}
