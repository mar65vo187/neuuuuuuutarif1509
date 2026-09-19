"use client";

import { Loader2, LockKeyhole, Send, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Channel = "all" | "admins";
type Msg = {
  id: number;
  body: string;
  channel: Channel;
  createdAt: string;
  employeeId: number | null;
  authorName: string | null;
  authorImageUrl: string | null;
};

export function ChatPanel({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  const [channel, setChannel] = useState<Channel>("all");
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
      const res = await fetch(`/api/portal/chat?channel=${channel}`, { cache: "no-store", signal: controller.signal });
      if (loadRequest.current !== controller) return;
      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }
      if (res.status === 403) {
        setChannel("all");
        setError("Der Admin-Chat ist ausschließlich für Administratoren freigegeben.");
        return;
      }
      if (!res.ok) throw new Error("Chat unavailable");
      const json = (await res.json()) as { ok: boolean; messages: Msg[]; me: number };
      if (loadRequest.current !== controller) return;
      if (json.ok && Array.isArray(json.messages)) {
        setMessages(json.messages);
        setMe(json.me);
        setError(null);
      } else {
        throw new Error("Invalid chat response");
      }
    } catch {
      if (loadRequest.current === controller) setError("Nachrichten konnten nicht geladen werden. Die Verbindung wird erneut geprüft.");
    } finally {
      clearTimeout(timeout);
      if (loadRequest.current === controller) {
        loadRequest.current = null;
        setLoaded(true);
      }
    }
  }, [channel]);

  useEffect(() => {
    const first = setTimeout(() => { void load(); }, 0);
    const timer = setInterval(load, 6000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      loadRequest.current?.abort();
      loadRequest.current = null;
      sendRequest.current?.abort();
      sendRequest.current = null;
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const switchChannel = (next: Channel) => {
    if (next === channel) return;
    loadRequest.current?.abort();
    loadRequest.current = null;
    setMessages([]);
    setLoaded(false);
    setError(null);
    setText("");
    setChannel(next);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setSending(true);
    const controller = new AbortController();
    sendRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, channel }),
        signal: controller.signal,
      });
      if (sendRequest.current !== controller) return;
      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }
      const json = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setText("");
        loadRequest.current?.abort();
        loadRequest.current = null;
        await load();
      } else {
        setError(json.error ?? "Senden fehlgeschlagen. Die Nachricht bleibt im Eingabefeld.");
      }
    } catch {
      if (sendRequest.current === controller) setError("Senden fehlgeschlagen. Bitte den Verlauf vor einem erneuten Versuch prüfen.");
    } finally {
      clearTimeout(timeout);
      if (sendRequest.current === controller) {
        sendRequest.current = null;
        sendingRef.current = false;
        setSending(false);
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-white">
      {isAdmin && (
        <div className="flex gap-2 border-b border-line bg-paper p-3" role="tablist" aria-label="Chat-Kanal">
          <button
            type="button"
            role="tab"
            aria-selected={channel === "all"}
            onClick={() => switchChannel("all")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${channel === "all" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}
          >
            <Users className="h-4 w-4" /> Alle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={channel === "admins"}
            onClick={() => switchChannel("admins")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${channel === "admins" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}
          >
            <LockKeyhole className="h-4 w-4" /> Nur Admins
          </button>
        </div>
      )}

      <div className="flex h-[calc(100vh-270px)] min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!loaded ? (
            <div className="space-y-3">
              <div className="skeleton h-12 w-2/3 rounded-2xl" />
              <div className="skeleton ml-auto h-12 w-1/2 rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-[14.5px] text-steel" role="status">
              {error ?? (channel === "admins" ? "Noch keine Nachrichten im Admin-Chat." : "Noch keine Nachrichten im Team-Chat.")}
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.employeeId === me;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${mine ? "bg-electric text-white" : "bg-paper text-ink"}`}>
                    {!mine && <p className="text-[11.5px] font-bold text-electric-deep">{message.authorName ?? "Team"}</p>}
                    <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{message.body}</p>
                    <p className={`mt-1 text-[10.5px] ${mine ? "text-white/70" : "text-steel"}`}>
                      {new Date(message.createdAt).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="border-t border-line p-3">
          {error && messages.length > 0 && <p role="alert" className="mb-2 text-[12.5px] text-red-600">{error}</p>}
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder={channel === "admins" ? "Nachricht nur an Administratoren …" : "Nachricht an das gesamte Team …"}
              aria-label={channel === "admins" ? "Nachricht an Administratoren" : "Nachricht an das Team"}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
            />
            <button type="submit" disabled={sending || !text.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-white hover:bg-electric disabled:opacity-50" aria-label="Senden">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
