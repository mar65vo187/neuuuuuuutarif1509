"use client";

import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Msg = { id: number; body: string; createdAt: string; employeeId: number | null; authorName: string | null };

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [me, setMe] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadRequest = useRef<AbortController | null>(null);
  const sendRequest = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadRequest.current) return;
    const controller = new AbortController();
    loadRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/portal/chat", { cache: "no-store", signal: controller.signal });
      if (loadRequest.current !== controller) return;
      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }
      if (!res.ok) throw new Error("Chat unavailable");
      const json = (await res.json()) as { ok: boolean; messages: Msg[]; me: number };
      if (loadRequest.current !== controller) return;
      if (json.ok && Array.isArray(json.messages)) {
        setMessages(json.messages);
        setMe(json.me);
        setError((current) => current?.startsWith("Nachrichten konnten nicht geladen") ? null : current);
      } else throw new Error("Invalid chat response");
    } catch {
      if (loadRequest.current === controller) setError("Nachrichten konnten nicht geladen werden. Die Verbindung wird erneut geprüft.");
    } finally {
      clearTimeout(timeout);
      if (loadRequest.current === controller) { loadRequest.current = null; setLoaded(true); }
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => { void load(); }, 0);
    const t = setInterval(load, 6000);
    return () => {
      clearTimeout(first); clearInterval(t);
      loadRequest.current?.abort(); loadRequest.current = null;
      sendRequest.current?.abort(); sendRequest.current = null;
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setSending(true);
    const controller = new AbortController();
    sendRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/portal/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }), signal: controller.signal });
      if (sendRequest.current !== controller) return;
      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }
      const json = await res.json() as { ok?: boolean; error?: string };
      if (sendRequest.current !== controller) return;
      if (res.ok && json.ok) {
        setText((current) => current.trim() === body ? "" : current);
        loadRequest.current?.abort(); loadRequest.current = null;
        await load();
      } else setError(json.error ?? "Senden fehlgeschlagen. Deine Nachricht bleibt erhalten.");
    } catch {
      if (sendRequest.current === controller) setError("Senden fehlgeschlagen. Prüfe den Verlauf vor einem erneuten Versuch.");
    } finally {
      clearTimeout(timeout);
      if (sendRequest.current === controller) { sendRequest.current = null; sendingRef.current = false; setSending(false); }
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col rounded-[22px] border border-line bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {!loaded ? (
          <div className="space-y-3"><div className="skeleton h-12 w-2/3 rounded-2xl" /><div className="skeleton ml-auto h-12 w-1/2 rounded-2xl" /></div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-[14.5px] text-steel" role="status">{error ?? "Noch keine Nachrichten. Schreib die erste."}</p>
        ) : (
          messages.map((m) => {
            const mine = m.employeeId === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${mine ? "bg-electric text-white" : "bg-paper text-ink"}`}>
                  {!mine && <p className="text-[11.5px] font-bold text-electric-deep">{m.authorName ?? "Team"}</p>}
                  <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[10.5px] ${mine ? "text-white/70" : "text-steel"}`}>{new Date(m.createdAt).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input className="field flex-1" placeholder={error ?? "Nachricht an das Team …"} title={error ?? undefined} aria-label={error ?? "Nachricht an das Team"} aria-invalid={Boolean(error)} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <button type="submit" disabled={sending || !text.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-white hover:bg-electric disabled:opacity-50" aria-label={error ?? "Senden"} title={error ?? undefined}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
