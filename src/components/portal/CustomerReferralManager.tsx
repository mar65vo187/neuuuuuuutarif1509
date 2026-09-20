"use client";

import { ArrowRight, Loader2, Network, Plus, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { SERVICES } from "@/lib/content";

type ReferralRow = {
  id: number;
  referredLeadId: number | null;
  referredCustomerId: number | null;
  relationship: string;
  note: string;
  createdAt: string;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  leadStatus: string | null;
  leadTopic: string | null;
  targetCustomerNumber: string | null;
  targetCustomerName: string | null;
};

type Props = {
  customerId: number;
  customerName: string;
  rows: ReferralRow[];
};

const RELATIONSHIPS = [
  ["", "Beziehung nicht angegeben"],
  ["familie", "Familie"],
  ["freund_bekannter", "Freund / Bekannter"],
  ["nachbar", "Nachbar"],
  ["kollege", "Kollege / Arbeitskontakt"],
  ["geschaeftskontakt", "Geschäftskontakt"],
  ["sonstiges", "Sonstiges"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  kontaktiert: "Kontaktiert",
  termin_bestaetigt: "Terminiert",
  in_beratung: "In Beratung",
  abgeschlossen: "Abgeschlossen",
  verloren: "Nicht zustande gekommen",
};

export function CustomerReferralManager({ customerId, customerName, rows }: Props) {
  const router = useRouter();
  const saving = useRef(false);
  const topics = useMemo(() => [...new Set(SERVICES.map((service) => service.name))], []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  function toggleTopic(topic: string) {
    setSelectedTopics((current) => current.includes(topic)
      ? current.filter((item) => item !== topic)
      : [...current, topic].slice(0, 12));
  }

  async function submit() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/enterprise/customers/${customerId}/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          relationship,
          topics: selectedTopics,
          note: note.trim(),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string; lead?: { id: number } };
      if (!response.ok || !json.ok || !json.lead) {
        throw new Error(json.error ?? "Empfehlung konnte nicht gespeichert werden.");
      }
      setName("");
      setEmail("");
      setPhone("");
      setRelationship("");
      setSelectedTopics([]);
      setNote("");
      setOpen(false);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Empfehlung konnte nicht gespeichert werden.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const converted = rows.filter((row) => row.referredCustomerId).length;
  const won = rows.filter((row) => row.leadStatus === "abgeschlossen").length;

  return (
    <div>
      <div className="rounded-[20px] border border-electric/15 bg-[linear-gradient(145deg,rgba(79,141,255,0.08),rgba(255,255,255,0.96))] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft">
              <Network className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[15px] font-extrabold">Empfehlungsnetzwerk <span className="text-steel">(Vitamin B)</span></p>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-steel">
                Wenn {customerName} jemanden empfiehlt, hier eintragen. Daraus wird automatisch ein Lead und die Herkunft bleibt dauerhaft mit dieser Kundenakte verbunden.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-extrabold text-white hover:bg-electric"
          >
            {open ? "Schließen" : <><Plus className="h-4 w-4" /> Empfehlung eintragen</>}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-white/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel">Empfehlungen</p>
            <p className="mt-1 text-[20px] font-extrabold">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel">Wurden Kunden</p>
            <p className="mt-1 text-[20px] font-extrabold">{converted}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel">Abgeschlossen</p>
            <p className="mt-1 text-[20px] font-extrabold">{won}</p>
          </div>
        </div>

        {open && (
          <div className="mt-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <UserRoundPlus className="h-4 w-4 text-electric-deep" />
              <p className="text-[13.5px] font-extrabold">Empfohlenen Kontakt aufnehmen</p>
            </div>
            <p className="mt-1 text-[11.5px] text-steel">Nicht alle Daten bekannt? Felder dürfen leer bleiben. Ein Name, Kontakt, Thema oder eine Notiz reicht.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="label">Name
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="z. B. Max Mustermann" />
              </label>
              <label className="label">Beziehung zu {customerName}
                <select className="field" value={relationship} onChange={(event) => setRelationship(event.target.value)}>
                  {RELATIONSHIPS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="label">Telefon
                <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} type="tel" placeholder="optional" />
              </label>
              <label className="label">E-Mail
                <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={200} type="email" placeholder="optional" />
              </label>
            </div>

            <div className="mt-4">
              <p className="label">Interessensbereiche</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => {
                  const active = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTopic(topic)}
                      className={"chip px-3 py-2 text-[11.5px] transition " + (active ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700 hover:border-electric/30")}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="label">Notiz / Kontext</span>
              <textarea
                className="field"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1500}
                placeholder="z. B. ist Hausbesitzer, interessiert sich für PV; bitte abends anrufen …"
              />
            </label>

            {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">{error}</p>}

            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[13px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}
              Als Empfehlung & Lead speichern
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((row) => {
            const displayName = row.targetCustomerName || row.leadName || row.leadEmail || row.leadPhone || `Empfehlung #${row.id}`;
            const href = row.referredCustomerId
              ? `/portal/kunden/${row.referredCustomerId}`
              : row.referredLeadId
                ? `/portal/leads/${row.referredLeadId}`
                : null;
            return (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold">{displayName}</p>
                    <p className="mt-0.5 text-[11px] text-steel">
                      {row.referredCustomerId
                        ? "Ist bereits Kunde"
                        : STATUS_LABELS[row.leadStatus ?? ""] ?? "Empfehlung erfasst"}
                      {row.relationship ? ` · ${RELATIONSHIPS.find(([key]) => key === row.relationship)?.[1] ?? row.relationship}` : ""}
                    </p>
                    {row.leadTopic && <p className="mt-1 text-[11.5px] text-steel">{row.leadTopic}</p>}
                    {row.note && <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-700">{row.note}</p>}
                  </div>
                  {href && (
                    <Link href={href} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11px] font-bold text-electric-deep hover:border-electric/30">
                      Öffnen <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
