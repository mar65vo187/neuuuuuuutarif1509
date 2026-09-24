"use client";

import { AtSign, Eye, Loader2, LockKeyhole, Send, ShieldCheck, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Channel = "all" | "admins" | "direct";

type Recipient = {
  id: number;
  name: string;
  email: string;
  imageUrl: string | null;
  role: "admin" | "berater";
};

type Msg = {
  id: number;
  body: string;
  channel: Channel;
  createdAt: string;
  employeeId: number | null;
  recipientEmployeeId: number | null;
  authorName: string | null;
  authorImageUrl: string | null;
  authorEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientImageUrl: string | null;
};

type ChatResponse = {
  ok: boolean;
  messages: Msg[];
  recipients: Recipient[];
  me: number;
  owner: boolean;
};

export function ChatPanel({
  isAdmin = false,
  isOwner = false,
}: {
  isAdmin?: boolean;
  isOwner?: boolean;
} = {}) {
  const [channel, setChannel] = useState<Channel>("all");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [me, setMe] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [ownerAllDirect, setOwnerAllDirect] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadRequest = useRef<AbortController | null>(null);
  const sendRequest = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  const selectedRecipient = useMemo(
    () => recipients.find((recipient) => recipient.id === selectedRecipientId) ?? null,
    [recipients, selectedRecipientId],
  );

  const load = useCallback(async () => {
    if (loadRequest.current) return;
    const controller = new AbortController();
    loadRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const params = new URLSearchParams({ channel });
      if (channel === "direct" && selectedRecipientId) params.set("recipientId", String(selectedRecipientId));
      if (channel === "direct" && ownerAllDirect) params.set("scope", "owner-all");

      const res = await fetch(`/api/portal/chat?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (loadRequest.current !== controller) return;

      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }
      if (res.status === 403) {
        setOwnerAllDirect(false);
        if (channel === "admins") setChannel("all");
        setError("Für diesen Nachrichtenbereich fehlt die Berechtigung.");
        return;
      }
      if (!res.ok) throw new Error("Chat unavailable");

      const json = (await res.json()) as ChatResponse;
      if (loadRequest.current !== controller) return;
      if (!json.ok || !Array.isArray(json.messages)) throw new Error("Invalid chat response");

      setMessages(json.messages);
      setMe(json.me);
      if (channel === "direct" && Array.isArray(json.recipients)) setRecipients(json.recipients);
      setError(null);
    } catch {
      if (loadRequest.current === controller) {
        setError("Nachrichten konnten nicht geladen werden. Die Verbindung wird erneut geprüft.");
      }
    } finally {
      clearTimeout(timeout);
      if (loadRequest.current === controller) {
        loadRequest.current = null;
        setLoaded(true);
      }
    }
  }, [channel, ownerAllDirect, selectedRecipientId]);

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

  const resetLoad = () => {
    loadRequest.current?.abort();
    loadRequest.current = null;
    setMessages([]);
    setLoaded(false);
    setError(null);
  };

  const switchChannel = (next: Channel) => {
    if (next === channel) return;
    resetLoad();
    setText("");
    setRecipientEmail("");
    setSelectedRecipientId(null);
    setOwnerAllDirect(false);
    setChannel(next);
  };

  const chooseRecipient = (value: string) => {
    resetLoad();
    const id = Number(value);
    const recipient = recipients.find((item) => item.id === id) ?? null;
    setSelectedRecipientId(recipient?.id ?? null);
    setRecipientEmail(recipient?.email ?? "");
    setOwnerAllDirect(false);
  };

  const typeRecipientEmail = (value: string) => {
    const normalized = value.trim().toLowerCase();
    const match = recipients.find((item) => item.email.trim().toLowerCase() === normalized) ?? null;
    if ((match?.id ?? null) !== selectedRecipientId) resetLoad();
    setRecipientEmail(value);
    setSelectedRecipientId(match?.id ?? null);
    setOwnerAllDirect(false);
  };

  const toggleOwnerOverview = () => {
    resetLoad();
    setOwnerAllDirect((current) => !current);
    setSelectedRecipientId(null);
    setRecipientEmail("");
    setText("");
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    const hasDirectRecipient = Boolean(selectedRecipientId || recipientEmail.trim());
    if (!body || sendingRef.current || (channel === "direct" && (!hasDirectRecipient || ownerAllDirect))) return;

    sendingRef.current = true;
    setError(null);
    setSending(true);
    const controller = new AbortController();
    sendRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const payload: Record<string, unknown> = { body, channel };
      if (channel === "direct") {
        if (selectedRecipientId) payload.recipientId = selectedRecipientId;
        if (recipientEmail.trim()) payload.recipientEmail = recipientEmail.trim();
      }

      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (sendRequest.current !== controller) return;

      if (res.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fchat");
        return;
      }

      const json = await res.json() as { ok?: boolean; error?: string; recipientEmployeeId?: number | null };
      if (res.ok && json.ok) {
        setText("");
        if (channel === "direct" && json.recipientEmployeeId && !selectedRecipientId) {
          setSelectedRecipientId(json.recipientEmployeeId);
          return;
        }
        loadRequest.current?.abort();
        loadRequest.current = null;
        await load();
      } else {
        setError(json.error ?? "Senden fehlgeschlagen. Die Nachricht bleibt im Eingabefeld.");
      }
    } catch {
      if (sendRequest.current === controller) {
        setError("Senden fehlgeschlagen. Bitte den Verlauf vor einem erneuten Versuch prüfen.");
      }
    } finally {
      clearTimeout(timeout);
      if (sendRequest.current === controller) {
        sendRequest.current = null;
        sendingRef.current = false;
        setSending(false);
      }
    }
  };

  const directRecipientReady = Boolean(selectedRecipientId || recipientEmail.trim());
  const composerPlaceholder = channel === "admins"
    ? "Nachricht nur an Administratoren …"
    : channel === "direct"
      ? selectedRecipient
        ? `Direktnachricht an ${selectedRecipient.name} …`
        : "Private Nachricht schreiben …"
      : "Nachricht an das gesamte Team …";

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-white">
      <div className="flex flex-wrap gap-2 border-b border-line bg-paper p-3" role="tablist" aria-label="Nachrichtenbereich">
        <button
          type="button"
          role="tab"
          aria-selected={channel === "all"}
          onClick={() => switchChannel("all")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${channel === "all" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}
        >
          <Users className="h-4 w-4" /> Team
        </button>

        {isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={channel === "admins"}
            onClick={() => switchChannel("admins")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${channel === "admins" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}
          >
            <LockKeyhole className="h-4 w-4" /> Admins
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={channel === "direct"}
          onClick={() => switchChannel("direct")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${channel === "direct" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}
        >
          <UserRound className="h-4 w-4" /> Direktnachrichten
        </button>
      </div>

      {channel === "direct" && (
        <div className="border-b border-line bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.1fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Berater auswählen</span>
              <select
                className="field w-full"
                value={selectedRecipientId ?? ""}
                onChange={(event) => chooseRecipient(event.target.value)}
                disabled={ownerAllDirect}
                aria-label="Empfänger auswählen"
              >
                <option value="">Empfänger wählen …</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name} · {recipient.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Oder E-Mail eingeben</span>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                <input
                  className="field w-full pl-10"
                  type="email"
                  list="chat-recipient-emails"
                  placeholder="berater@tarifwerk.eu"
                  value={recipientEmail}
                  onChange={(event) => typeRecipientEmail(event.target.value)}
                  disabled={ownerAllDirect}
                  autoComplete="off"
                  aria-label="E-Mail des Empfängers"
                />
                <datalist id="chat-recipient-emails">
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.email}>{recipient.name}</option>
                  ))}
                </datalist>
              </div>
            </label>

            {isOwner && (
              <button
                type="button"
                onClick={toggleOwnerOverview}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[12.5px] font-extrabold transition-colors ${ownerAllDirect ? "border-electric bg-electric text-white" : "border-line bg-paper text-ink hover:border-electric/40"}`}
              >
                <Eye className="h-4 w-4" />
                {ownerAllDirect ? "Zur eigenen Inbox" : "Owner: alle Nachrichten"}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-steel">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Privat
            </span>
            {ownerAllDirect ? (
              <span>Owner-Übersicht: alle privaten Direktnachrichten im System. In dieser Ansicht kann nicht gesendet werden.</span>
            ) : selectedRecipient ? (
              <span>Aktiver privater Verlauf mit <strong className="text-ink">{selectedRecipient.name}</strong>.</span>
            ) : (
              <span>Ohne Auswahl siehst du nur Direktnachrichten, an denen du selbst beteiligt bist.</span>
            )}
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-270px)] min-h-[440px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!loaded ? (
            <div className="space-y-3">
              <div className="skeleton h-12 w-2/3 rounded-2xl" />
              <div className="skeleton ml-auto h-12 w-1/2 rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-[14.5px] text-steel" role="status">
              {error ?? (
                channel === "admins"
                  ? "Noch keine Nachrichten im Admin-Chat."
                  : channel === "direct"
                    ? ownerAllDirect
                      ? "Noch keine Direktnachrichten im System."
                      : selectedRecipient
                        ? `Noch keine Direktnachrichten mit ${selectedRecipient.name}.`
                        : "Noch keine privaten Direktnachrichten."
                    : "Noch keine Nachrichten im Team-Chat."
              )}
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.employeeId === me;
              return (
                <div key={message.id} className={`flex ${mine && !ownerAllDirect ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${mine && !ownerAllDirect ? "bg-electric text-white" : "bg-paper text-ink"}`}>
                    {(channel === "direct" || !mine) && (
                      <p className={`text-[11.5px] font-bold ${mine && !ownerAllDirect ? "text-white/80" : "text-electric-deep"}`}>
                        {channel === "direct"
                          ? `${message.authorName ?? "Ehemaliger Mitarbeiter"} → ${message.recipientName ?? "Ehemaliger Mitarbeiter"}`
                          : message.authorName ?? "Team"}
                      </p>
                    )}
                    <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{message.body}</p>
                    <p className={`mt-1 text-[10.5px] ${mine && !ownerAllDirect ? "text-white/70" : "text-steel"}`}>
                      {new Date(message.createdAt).toLocaleString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="border-t border-line p-3">
          {error && messages.length > 0 && (
            <p role="alert" className="mb-2 text-[12.5px] text-red-600">{error}</p>
          )}
          {channel === "direct" && !ownerAllDirect && !directRecipientReady && (
            <p className="mb-2 text-[12px] text-steel">Wähle einen Berater aus oder gib seine E-Mail-Adresse ein, bevor du sendest.</p>
          )}
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder={ownerAllDirect ? "Owner-Übersicht ist schreibgeschützt" : composerPlaceholder}
              aria-label={channel === "direct" ? "Private Direktnachricht" : channel === "admins" ? "Nachricht an Administratoren" : "Nachricht an das Team"}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              disabled={ownerAllDirect}
            />
            <button
              type="submit"
              disabled={sending || !text.trim() || (channel === "direct" && (!directRecipientReady || ownerAllDirect))}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-white hover:bg-electric disabled:opacity-50"
              aria-label="Senden"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
