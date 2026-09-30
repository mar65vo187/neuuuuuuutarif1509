"use client";

import { useRouter } from "next/navigation";
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type ConsentState = { purpose: string; granted: boolean | null; source: string | null; recordedAt: string | null };

type Props = {
  customerId: number;
  customerNumber: string;
  consents: ConsentState[];
  purposeLabels: Record<string, string>;
  sourceLabels: Record<string, string>;
  canRecordConsent: boolean;
  canManagePrivacy: boolean;
  erasureBlockers: string[];
  anonymized: boolean;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
}

export function CustomerPrivacyPanel({
  customerId,
  customerNumber,
  consents,
  purposeLabels,
  sourceLabels,
  canRecordConsent,
  canManagePrivacy,
  erasureBlockers,
  anonymized,
}: Props) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [purpose, setPurpose] = useState(consents[0]?.purpose ?? "");
  const [granted, setGranted] = useState("true");
  const [source, setSource] = useState(Object.keys(sourceLabels)[0] ?? "");
  const [note, setNote] = useState("");
  const [confirmNumber, setConfirmNumber] = useState("");
  const [reason, setReason] = useState("");

  async function post(key: string, url: string, body: Record<string, unknown>, success: string) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 401) {
        window.location.replace(`/portal/login?next=${encodeURIComponent(`/portal/kunden/${customerId}`)}`);
        return false;
      }
      const json = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Speichern fehlgeschlagen.");
        return false;
      }
      setMessage(success);
      router.refresh();
      return true;
    } catch {
      setError("Verbindung fehlgeschlagen.");
      return false;
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  async function saveConsent() {
    const ok = await post("consent", `/api/portal/privacy/customers/${customerId}/consents`, { purpose, granted: granted === "true", source, note: note.trim() }, granted === "true" ? "Einwilligung gespeichert." : "Widerruf gespeichert.");
    if (ok) setNote("");
  }

  async function erase() {
    if (!window.confirm("Die Anonymisierung kann nicht rückgängig gemacht werden. Fortfahren?")) return;
    const ok = await post("erase", `/api/portal/privacy/customers/${customerId}/erase`, { confirmCustomerNumber: confirmNumber.trim(), reason: reason.trim() }, "Kunde wurde anonymisiert.");
    // Anonymisierte Kunden sind archiviert und erscheinen nicht mehr in der Kundenliste.
    if (ok) {
      router.replace("/portal/kunden");
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric-deep"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold">Datenschutz & Einwilligungen</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-steel">Jede Einwilligung und jeder Widerruf wird mit Quelle, Zeitpunkt und Mitarbeiter protokolliert. Frühere Einträge bleiben als Nachweis erhalten.</p>
        </div>
      </div>

      {anonymized && (
        <p className="rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] font-semibold text-ink">Dieser Kunde wurde nach Art. 17 DSGVO anonymisiert. Aufträge und Provisionen bleiben für die gesetzliche Aufbewahrung erhalten.</p>
      )}

      <ul className="grid gap-2 sm:grid-cols-3">
        {consents.map((consent) => (
          <li key={consent.purpose} className="rounded-xl border border-line p-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-steel">{purposeLabels[consent.purpose] ?? consent.purpose}</p>
            <p className={`mt-1 text-[14px] font-extrabold ${consent.granted === true ? "text-emerald-700" : consent.granted === false ? "text-red-700" : "text-steel"}`}>
              {consent.granted === true ? "Erteilt" : consent.granted === false ? "Widerrufen / abgelehnt" : "Nicht erfasst"}
            </p>
            {consent.recordedAt && (
              <p className="mt-0.5 text-[11px] text-steel">{sourceLabels[consent.source ?? ""] ?? consent.source} · {formatDateTime(consent.recordedAt)}</p>
            )}
          </li>
        ))}
      </ul>

      {canRecordConsent && !anonymized && (
        <div className="rounded-xl border border-line p-4">
          <p className="text-[13px] font-bold">Einwilligung oder Widerruf erfassen</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="label">Zweck</span>
              <select className="field" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                {consents.map((consent) => <option key={consent.purpose} value={consent.purpose}>{purposeLabels[consent.purpose] ?? consent.purpose}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Entscheidung</span>
              <select className="field" value={granted} onChange={(event) => setGranted(event.target.value)}>
                <option value="true">Einwilligung erteilt</option>
                <option value="false">Widerrufen / abgelehnt</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Quelle</span>
              <select className="field" value={source} onChange={(event) => setSource(event.target.value)}>
                {Object.entries(sourceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label">Nachweis / Notiz (z. B. „Formular vom 12.10., Ablage Ordner A“)</span>
            <input type="text" maxLength={500} className="field" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button type="button" onClick={saveConsent} disabled={busy !== null || !purpose} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric disabled:opacity-60">
            {busy === "consent" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Speichern
          </button>
        </div>
      )}

      {canManagePrivacy && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="text-[13px] font-bold">Auskunft (Art. 15 DSGVO)</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-steel">Alle gespeicherten Daten als JSON-Datei. Der Abruf wird als Datenschutz-Anfrage und im Audit-Log erfasst. Voraussetzung: aktive Zwei-Faktor-Anmeldung.</p>
            <a href={`/api/portal/privacy/customers/${customerId}/export`} download className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink/40">
              <Download className="h-4 w-4" aria-hidden="true" /> Auskunft herunterladen
            </a>
          </div>

          {!anonymized && (
            <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
              <p className="text-[13px] font-bold text-red-800">Löschen / Anonymisieren (Art. 17 DSGVO)</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-steel">Entfernt Name, Kontaktdaten, Adresse, Notizen und Dokumente dieses Kunden und seiner Leads. Aufträge, Provisionen und Einwilligungsnachweise bleiben für gesetzliche Aufbewahrungspflichten erhalten. Nicht umkehrbar.</p>
              {erasureBlockers.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-red-800">
                  {erasureBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              ) : (
                <>
                  <label className="mt-3 block">
                    <span className="label">Grund (z. B. „Löschanfrage per E-Mail vom 01.10.“)</span>
                    <input type="text" maxLength={500} className="field" value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <label className="mt-2 block">
                    <span className="label">Zur Bestätigung Kundennummer {customerNumber} eingeben</span>
                    <input type="text" autoComplete="off" className="field" value={confirmNumber} onChange={(event) => setConfirmNumber(event.target.value)} />
                  </label>
                  <button
                    type="button"
                    onClick={erase}
                    disabled={busy !== null || confirmNumber.trim() !== customerNumber || reason.trim().length < 3}
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-red-700 px-4 text-[13px] font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    {busy === "erase" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    Endgültig anonymisieren
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div role="status" aria-live="polite">
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">{error}</p> : null}
        {!error && message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{message}</p> : null}
      </div>
    </div>
  );
}
