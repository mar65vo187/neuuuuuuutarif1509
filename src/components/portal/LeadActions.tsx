"use client";

import { useRouter } from "next/navigation";
import { AlarmClock, BrainCircuit, CalendarCheck, Check, Flame, Loader2, PhoneCall, Save, Tags, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/content";
import { CALL_REACTION_LABELS, CALL_REACHED_PERSON_LABELS } from "@/lib/call-intelligence";
import { STATUS_STYLES } from "./ui";

type Props = {
  leadId: number;
  status: string;
  confirmedSlot: string | null;
  assigned: boolean;
  isAppointment: boolean;
  priority: string;
  contactOutcome: string;
  nextActionInput: string;
  tags: string[];
};

function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LeadActions({
  leadId,
  status,
  confirmedSlot,
  assigned,
  isAppointment,
  priority,
  contactOutcome,
  nextActionInput,
  tags,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState(confirmedSlot ?? "");
  const [note, setNote] = useState("");
  const [crmPriority, setCrmPriority] = useState(priority);
  const [outcome, setOutcome] = useState(contactOutcome);
  const [nextAction, setNextAction] = useState(nextActionInput);
  const [tagText, setTagText] = useState(tags.join(", "));
  const [callTime, setCallTime] = useState("");
  const [reachedPerson, setReachedPerson] = useState("customer");
  const [reaction, setReaction] = useState("neutral");
  const [callNote, setCallNote] = useState("");
  const [requestedCallback, setRequestedCallback] = useState("");
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [callResult, setCallResult] = useState<{ at: string | null; reason: string; action: string; autoScheduled: boolean; contactOutcome: string; priority: string } | null>(null);
  const saving = useRef(false);

  const patch = async (key: string, body: Record<string, unknown>) => {
    if (saving.current) return false;
    if (body.status === "termin_bestaetigt" && !slot.trim()) {
      setError("Bitte trage zuerst eine abgestimmte Terminzeit ein.");
      return false;
    }
    saving.current = true;
    setBusy(key);
    setError(null);
    try {
      const payload = body.status === "termin_bestaetigt" ? { ...body, confirmedSlot: slot.trim() } : body;
      const res = await fetch(`/api/portal/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401) {
        window.location.replace(`/portal/login?next=${encodeURIComponent(`/portal/leads/${leadId}`)}`);
        return false;
      }
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Speichern fehlgeschlagen.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Verbindung fehlgeschlagen.");
      return false;
    } finally {
      saving.current = false;
      setBusy(null);
    }
  };

  function setFollowUp(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    setNextAction(localDateTimeValue(date));
  }

  const saveCrm = () => {
    const parsedTags = [...new Set(tagText.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
    return patch("crm", {
      priority: crmPriority,
      contactOutcome: outcome,
      nextActionAt: nextAction ? new Date(nextAction).toISOString() : null,
      tags: parsedTags,
    });
  };

  const logCall = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy("call");
    setError(null);
    setCallResult(null);
    try {
      const res = await fetch(`/api/portal/leads/${leadId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calledAt: callTime ? new Date(callTime).toISOString() : undefined,
          reachedPerson,
          reaction,
          note: callNote.trim(),
          requestedCallbackAt: requestedCallback ? new Date(requestedCallback).toISOString() : null,
          autoSchedule,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401) {
        window.location.replace(`/portal/login?next=${encodeURIComponent(`/portal/leads/${leadId}`)}`);
        return;
      }
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        recommendation?: { at: string | null; reason: string; action: string; autoScheduled: boolean; contactOutcome: string; priority: string };
      };
      if (!res.ok || !json.ok || !json.recommendation) {
        setError(json.error ?? "Anruf konnte nicht gespeichert werden.");
        return;
      }
      setCallResult(json.recommendation);
      setOutcome(json.recommendation.contactOutcome);
      setCrmPriority(json.recommendation.priority);
      if (json.recommendation.at && json.recommendation.autoScheduled) {
        setNextAction(localDateTimeValue(new Date(json.recommendation.at)));
      }
      setCallTime("");
      setCallNote("");
      setRequestedCallback("");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {!assigned && (
        <button type="button" onClick={() => patch("assign", { assignToMe: true })} disabled={busy !== null} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">
          {busy === "assign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Anfrage übernehmen
        </button>
      )}

      <div>
        <p className="label">Pipeline-Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={busy !== null || key === status}
              onClick={() => patch(`status:${key}`, { status: key, confirmedSlot: key === "termin_bestaetigt" && slot ? slot : undefined })}
              className={`chip h-9 px-3.5 transition-all disabled:cursor-default ${key === status ? (STATUS_STYLES[key] ?? "border-line") + " ring-2 ring-offset-1 ring-ink/10" : "border-line bg-white text-ink-700 hover:border-ink/40"}`}
            >
              {busy === `status:${key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-ink p-4 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-electric-soft"><BrainCircuit className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold">Anruf dokumentieren</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-silver">Eintragen, was passiert ist. Das System schlägt automatisch den nächsten sinnvollen Kontakt vor und kann direkt eine Aufgabe anlegen.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-[11px] font-bold text-silver">Wer war dran?</span>
            <select className="field border-white/10 bg-white text-ink" value={reachedPerson} onChange={(event) => setReachedPerson(event.target.value)}>
              {Object.entries(CALL_REACHED_PERSON_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[11px] font-bold text-silver">Reaktion</span>
            <select
              className="field border-white/10 bg-white text-ink"
              value={reaction}
              onChange={(event) => {
                const value = event.target.value;
                setReaction(value);
                if (value === "no_answer") setReachedPerson("nobody");
              }}
            >
              {Object.entries(CALL_REACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[11px] font-bold text-silver">Wann angerufen?</span>
            <input type="datetime-local" className="field border-white/10 bg-white text-ink" value={callTime} onChange={(event) => setCallTime(event.target.value)} />
            <span className="mt-1 block text-[10px] text-silver">Leer lassen = jetzt.</span>
          </label>
          <label>
            <span className="mb-1.5 block text-[11px] font-bold text-silver">Gewünschter Rückruf</span>
            <input type="datetime-local" className="field border-white/10 bg-white text-ink" value={requestedCallback} onChange={(event) => setRequestedCallback(event.target.value)} />
            <span className="mt-1 block text-[10px] text-silver">Falls die Person selbst einen Zeitpunkt genannt hat.</span>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-bold text-silver">Kurze Gesprächsnotiz</span>
          <textarea rows={2} className="field border-white/10 bg-white text-ink" value={callNote} onChange={(event) => setCallNote(event.target.value)} placeholder="z. B. möchte erst mit Partner sprechen, Angebot interessant …" maxLength={1500} />
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] p-3">
          <input type="checkbox" checked={autoSchedule} onChange={(event) => setAutoSchedule(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-500" />
          <span>
            <span className="block text-[12px] font-bold">Empfehlung automatisch als Wiedervorlage übernehmen</span>
            <span className="mt-0.5 block text-[10.5px] leading-relaxed text-silver">Standardmäßig aktiv. Bei klarer Ablehnung oder falscher Nummer wird bewusst kein weiterer automatischer Anruf geplant.</span>
          </span>
        </label>

        <button type="button" disabled={busy !== null} onClick={logCall} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[13px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50">
          {busy === "call" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />} Anruf speichern & Folgekontakt planen
        </button>

        {callResult && (
          <div className={"mt-3 rounded-xl border p-3 text-[12px] " + (callResult.autoScheduled ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.05] text-silver")}>
            <p className="font-extrabold text-white">
              {callResult.at && callResult.autoScheduled ? "Wiedervorlage automatisch gesetzt" : callResult.action === "appointment" ? "Termin als nächster Schritt" : "Kein automatischer Rückruf"}
            </p>
            {callResult.at && <p className="mt-1 font-bold">{new Date(callResult.at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>}
            <p className="mt-1 leading-relaxed">{callResult.reason}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-electric/15 bg-[linear-gradient(145deg,rgba(79,141,255,0.10),rgba(255,255,255,0.94))] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><Flame className="h-4 w-4" /></span>
          <div>
            <p className="text-[14px] font-extrabold">CRM-Steuerung</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-steel">Priorität, Gesprächsausgang und nächste Aktion steuern die tägliche Bearbeitung.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label>
            <span className="label">Priorität</span>
            <select className="field" value={crmPriority} onChange={(event) => setCrmPriority(event.target.value)}>
              {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <label>
            <span className="label">Gesprächsausgang</span>
            <div className="relative">
              <PhoneCall className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <select className="field pl-10" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                {Object.entries(LEAD_CONTACT_OUTCOME_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </label>

          <div>
            <label htmlFor="next-action" className="label">Wiedervorlage / nächste Aktion</label>
            <div className="relative">
              <AlarmClock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <input id="next-action" type="datetime-local" className="field pl-10" value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 7].map((days) => (
                <button key={days} type="button" onClick={() => setFollowUp(days)} className="chip border-line bg-white text-ink-700 hover:border-electric/30">+{days} Tag{days > 1 ? "e" : ""}</button>
              ))}
              <button type="button" onClick={() => setNextAction("")} className="chip border-line bg-white text-steel hover:border-red-200 hover:text-red-600">Entfernen</button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-steel">Beim Speichern wird automatisch eine passende Aufgabe im Aufgabenbereich erstellt oder aktualisiert.</p>
          </div>

          <label>
            <span className="label">Tags</span>
            <div className="relative">
              <Tags className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-steel" />
              <input className="field pl-10" value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="z. B. Familie, Glasfaser, Wechsel 2027" maxLength={500} />
            </div>
            <span className="mt-1 block text-[10.5px] text-steel">Mit Komma trennen, maximal 12 Tags.</span>
          </label>

          <button type="button" disabled={busy !== null} onClick={saveCrm} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[13px] font-extrabold text-white shadow-[0_12px_30px_-16px_rgba(79,141,255,0.8)] transition hover:bg-electric-deep disabled:opacity-50">
            {busy === "crm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} CRM-Daten speichern
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="inline-flex items-center gap-2 text-[14px] font-bold text-emerald-900"><CalendarCheck className="h-4 w-4" /> {isAppointment ? "Termin bestätigen" : "Termin vereinbaren"}</p>
        <p className="mt-1 text-[12.5px] text-emerald-800/80">Trage die abgestimmte Zeit ein. Der Lead wird anschließend direkt als „Terminiert“ einsortiert.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="field flex-1" placeholder="z. B. Di, 14.05. · 18:30 Uhr · Video-Call" value={slot} onChange={(event) => setSlot(event.target.value)} maxLength={160} />
          <button type="button" disabled={busy !== null || !slot.trim()} onClick={() => patch("confirm", { status: "termin_bestaetigt", confirmedSlot: slot.trim() })} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Termin speichern
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="note" className="label">Interne Notiz</label>
        <textarea id="note" rows={3} className="field" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Gesprächsnotiz, nächste Schritte, Besonderheiten …" maxLength={2000} />
        <button
          type="button"
          disabled={busy !== null || !note.trim()}
          onClick={async () => {
            const submitted = note.trim();
            const ok = await patch("note", { note: submitted });
            if (ok) setNote((current) => current.trim() === submitted ? "" : current);
          }}
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold text-ink hover:border-ink/40 disabled:opacity-50"
        >
          {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Notiz speichern
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
    </div>
  );
}
