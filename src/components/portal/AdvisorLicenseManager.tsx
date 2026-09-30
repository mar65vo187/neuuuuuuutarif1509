"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { LICENSE_KIND_LABELS, LICENSE_KINDS, LICENSE_STATUS_OPTIONS, REGISTERED_KINDS, type LicenseKind } from "@/lib/advisor-licenses";

type AdvisorOption = { id: number; name: string };
type LicenseRow = {
  id: number;
  advisorId: number;
  kind: string;
  status: string;
  holderName: string;
  businessAddress: string;
  registerNumber: string | null;
  authority: string;
};

export function AdvisorLicenseManager({ advisors, licenses }: { advisors: AdvisorOption[]; licenses: LicenseRow[] }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [advisorId, setAdvisorId] = useState(advisors[0]?.id ?? 0);
  const [kind, setKind] = useState<LicenseKind>("34d");
  const [status, setStatus] = useState(LICENSE_STATUS_OPTIONS["34d"][0]);
  const [holderName, setHolderName] = useState(advisors[0]?.name ?? "");
  const [businessAddress, setBusinessAddress] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [authority, setAuthority] = useState("");
  const [remuneration, setRemuneration] = useState("");
  const [noHoldings, setNoHoldings] = useState(false);

  async function call(key: string, url: string, init: RequestInit, success: string) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
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

  async function save() {
    const ok = await call("save", `/api/portal/admin/advisors/${advisorId}/licenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, status, holderName, businessAddress, registerNumber, authority, remuneration, noHoldingsConfirmed: noHoldings }),
    }, "Erlaubnis gespeichert und in der Erstinformation veröffentlicht.");
    if (ok) {
      setRegisterNumber("");
      setRemuneration("");
      setNoHoldings(false);
    }
  }

  async function remove(row: LicenseRow) {
    if (!window.confirm("Diese Erlaubnis aus der Erstinformation entfernen?")) return;
    await call(`remove-${row.id}`, `/api/portal/admin/advisors/${row.advisorId}/licenses?licenseId=${row.id}`, { method: "DELETE" }, "Erlaubnis entfernt.");
  }

  const advisorName = (id: number) => advisors.find((advisor) => advisor.id === id)?.name ?? `Berater #${id}`;

  return (
    <section className="portal-card rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,27,49,0.96),rgba(8,18,34,0.94))] p-5 text-slate-100 sm:p-6" aria-labelledby="licenses-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-electric-soft"><BadgeCheck className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <h2 id="licenses-title" className="text-[16px] font-extrabold">Erlaubnisse & Erstinformation</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-300">Gewerbeerlaubnisse der Berater (§§ 34c, 34d, 34f, 34i GewO). Gespeicherte Angaben erscheinen sofort öffentlich unter /erstinformation. Nur geprüfte Angaben eintragen.</p>
        </div>
      </div>

      {licenses.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
          {licenses.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-[12.5px]">
              <div className="min-w-0">
                <p className="font-bold">{advisorName(row.advisorId)} · {LICENSE_KIND_LABELS[row.kind as LicenseKind] ?? row.kind}</p>
                <p className="text-slate-300">{row.status}{row.registerNumber ? ` · Register ${row.registerNumber}` : ""} · {row.authority}</p>
              </div>
              <button type="button" onClick={() => remove(row)} disabled={busy !== null} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] font-semibold hover:border-red-300/60 disabled:opacity-50">
                {busy === `remove-${row.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} Entfernen
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[12px] text-amber-100">Noch keine Erlaubnis eingetragen. Für Versicherungs- und Immobilienvermittlung ist die Erstinformation Pflicht.</p>
      )}

      {advisors.length === 0 ? (
        <p className="mt-4 text-[12px] text-slate-300">Zuerst ein Beraterprofil anlegen.</p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block text-[12px] font-semibold">Berater
            <select className="field mt-1" value={advisorId} onChange={(event) => {
              const id = Number(event.target.value);
              setAdvisorId(id);
              setHolderName(advisors.find((advisor) => advisor.id === id)?.name ?? "");
            }}>
              {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
            </select>
          </label>
          <label className="block text-[12px] font-semibold">Erlaubnis
            <select className="field mt-1" value={kind} onChange={(event) => {
              const next = event.target.value as LicenseKind;
              setKind(next);
              setStatus(LICENSE_STATUS_OPTIONS[next][0]);
            }}>
              {LICENSE_KINDS.map((option) => <option key={option} value={option}>{LICENSE_KIND_LABELS[option]}</option>)}
            </select>
          </label>
          <label className="block text-[12px] font-semibold md:col-span-2">Status
            <select className="field mt-1" value={status} onChange={(event) => setStatus(event.target.value)}>
              {LICENSE_STATUS_OPTIONS[kind].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block text-[12px] font-semibold">Name / Firma des Vermittlers
            <input className="field mt-1" value={holderName} maxLength={160} onChange={(event) => setHolderName(event.target.value)} />
          </label>
          <label className="block text-[12px] font-semibold">Geschäftsanschrift
            <input className="field mt-1" value={businessAddress} maxLength={300} placeholder="Straße Nr., PLZ Ort" onChange={(event) => setBusinessAddress(event.target.value)} />
          </label>
          <label className="block text-[12px] font-semibold">Registernummer {REGISTERED_KINDS.includes(kind) ? "(Pflicht)" : "(für § 34c nicht vorgesehen)"}
            <input className="field mt-1" value={registerNumber} maxLength={60} placeholder="D-XXXX-XXXXX-XX" onChange={(event) => setRegisterNumber(event.target.value)} />
          </label>
          <label className="block text-[12px] font-semibold">Erlaubnisbehörde
            <input className="field mt-1" value={authority} maxLength={300} placeholder="z. B. IHK Wiesbaden, Wilhelmstraße 24–26, 65183 Wiesbaden" onChange={(event) => setAuthority(event.target.value)} />
          </label>
          <label className="block text-[12px] font-semibold md:col-span-2">Art der Vergütung (optional)
            <input className="field mt-1" value={remuneration} maxLength={500} placeholder="z. B. Provision, die in der Versicherungsprämie enthalten ist" onChange={(event) => setRemuneration(event.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-[12px] md:col-span-2">
            <input type="checkbox" className="mt-0.5" checked={noHoldings} onChange={(event) => setNoHoldings(event.target.checked)} />
            <span>Ich bestätige: Es bestehen keine direkten oder indirekten Beteiligungen von über 10 % an Stimmrechten oder Kapital eines Versicherungsunternehmens, und kein Versicherungsunternehmen hält solche Beteiligungen am Vermittler.</span>
          </label>
          <div className="md:col-span-2">
            <button type="button" onClick={save} disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-full bg-electric px-4 text-[13px] font-semibold text-white hover:bg-electric-deep disabled:opacity-60">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />} Erlaubnis speichern
            </button>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-3">
        {error ? <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200">{error}</p> : null}
        {!error && message ? <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-200">{message}</p> : null}
      </div>
    </section>
  );
}
