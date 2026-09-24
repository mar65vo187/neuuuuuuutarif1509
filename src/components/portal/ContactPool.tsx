"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, CalendarPlus, CheckCircle2, Clock3, ContactRound, Loader2, PackageSearch, Phone, Plus, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/ui";

type ContactRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  region: string | null;
  topic: string | null;
  preferred_channel: string | null;
  preferred_time: string | null;
  note: string;
  tags: string[];
  status: string;
  owner_employee_id: number | null;
  owner_name: string | null;
  next_contact_at: string | null;
  converted_lead_id: number | null;
  created_at: string;
  updated_at: string;
  products: Array<{ id: number; name: string; provider: string; relation: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  parked: "Geparkt",
  contacted: "Kontaktiert",
  qualified: "Qualifiziert",
  converted: "Als Lead übernommen",
  archived: "Archiviert",
};

function date(value: string | null) {
  if (!value) return "Keine Wiedervorlage";
  return new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ContactPool({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.name,row.email,row.phone ?? "",row.topic ?? "",row.region ?? "",row.owner_name ?? ""].some((value) => value.toLowerCase().includes(q)));
  }, [rows, query]);

  async function updateContact(contact: ContactRow, patch: { status?: "parked" | "contacted" | "qualified" | "archived"; nextContactAt?: string | null }) {
    if (busy !== null || contact.converted_lead_id) return;
    setBusy(contact.id); setNotice(null);
    try {
      const response = await fetch("/api/portal/contacts/" + contact.id, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Kontakt konnte nicht aktualisiert werden.");
      setNotice("Kontakt aktualisiert.");
      router.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Kontakt konnte nicht aktualisiert werden.");
    } finally {
      setBusy(null);
    }
  }

  async function convert(contact: ContactRow) {
    if (busy !== null || contact.converted_lead_id) return;
    setBusy(contact.id); setNotice(null);
    try {
      const response = await fetch("/api/portal/contacts/" + contact.id + "/convert", { method: "POST", credentials: "same-origin" });
      const result = await response.json() as { ok?: boolean; error?: string; leadId?: number; duplicate?: { href?: string } };
      if (!response.ok || !result.ok || !result.leadId) {
        if (result.duplicate?.href) {
          setNotice((result.error || "Datensatz existiert bereits.") + " Öffne den bestehenden Datensatz.");
          router.push(result.duplicate.href);
          return;
        }
        throw new Error(result.error || "Kontakt konnte nicht qualifiziert werden.");
      }
      router.push("/portal/leads/" + result.leadId);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Kontakt konnte nicht qualifiziert werden.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-electric-deep">Kontaktpool</p>
        <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Kontakte sammeln, ohne die Lead-Pipeline vollzumachen</h1>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-steel">Hier liegen Personen, die ihr irgendwann kontaktieren möchtet. Sie erzeugen bewusst keine Lead-Automationen, keine Pflicht-Nacharbeit und keine Pipeline-Aufgabe. Erst mit „Als Lead qualifizieren“ wechseln sie in den normalen Vertriebsprozess.</p>
      </div>
      <Link href="/portal/leads/neu?mode=contact" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 text-sm font-extrabold text-white"><Plus className="h-4 w-4" /> Kontakt anlegen</Link>
    </header>

    {notice && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>}

    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-steel">Bestand</p><p className="mt-1 text-2xl font-extrabold">{rows.filter((row) => !row.converted_lead_id).length} offene Kontakte</p></div>
        <label className="min-w-[260px] flex-1 sm:max-w-md"><span className="sr-only">Kontakte durchsuchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="field" placeholder="Name, Telefon, E-Mail, Thema, Region …" /></label>
      </div>
    </Card>

    <section className="grid gap-4 xl:grid-cols-2">
      {visible.map((contact) => <article id={"contact-" + contact.id} key={contact.id} className="rounded-[24px] border border-line bg-white p-5 shadow-[0_14px_38px_rgba(8,18,34,.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><ContactRound className="h-4 w-4 text-electric-deep" /><p className="font-extrabold text-ink">{contact.name || contact.email || contact.phone || "Kontakt #" + contact.id}</p></div>
            <p className="mt-1 text-xs text-steel">{contact.owner_name ? "Zuständig: " + contact.owner_name : "Ohne Zuständigkeit"} · #{contact.id}</p>
          </div>
          {contact.converted_lead_id ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800">Als Lead übernommen</span> : <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-steel">{STATUS_LABELS[contact.status] ?? "Nur Kontakt"}</span>}
        </div>

        <div className="mt-4 grid gap-2 text-xs text-steel sm:grid-cols-2">
          {contact.phone && <p className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {contact.phone}</p>}
          {contact.email && <p className="truncate">{contact.email}</p>}
          {contact.region && <p>Region: {contact.region}</p>}
          <p className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> {date(contact.next_contact_at)}</p>
        </div>

        {contact.topic && <p className="mt-4 rounded-xl bg-paper p-3 text-[12.5px] font-semibold text-ink">{contact.topic}</p>}
        {contact.note && <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-steel">{contact.note}</p>}
        {contact.products.length > 0 && <div className="mt-4"><p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-steel"><PackageSearch className="h-3.5 w-3.5" /> Produkte</p><div className="mt-2 flex flex-wrap gap-2">{contact.products.map((product) => <span key={product.id} className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-semibold text-ink">{product.provider} · {product.name}</span>)}</div></div>}
        {contact.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{contact.tags.map((tag) => <span key={tag} className="rounded-full border border-line px-2 py-1 text-[10px] text-steel">#{tag}</span>)}</div>}

        <div className="mt-5 flex flex-wrap gap-2">
          {!contact.converted_lead_id ? <>
            <button disabled={busy !== null} onClick={() => convert(contact)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />} Als Lead qualifizieren</button>
            {contact.status !== "contacted" && <button disabled={busy !== null} onClick={() => updateContact(contact, { status: "contacted" })} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink hover:border-electric/30 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Kontaktiert</button>}
            <button disabled={busy !== null} onClick={() => updateContact(contact, { status: "parked", nextContactAt: new Date(Date.now() + 7 * 86400000).toISOString() })} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink hover:border-electric/30 disabled:opacity-50"><CalendarPlus className="h-3.5 w-3.5" /> In 7 Tagen</button>
            <button disabled={busy !== null} onClick={() => updateContact(contact, { status: "archived" })} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-bold text-steel hover:border-red-200 hover:text-red-700 disabled:opacity-50"><Archive className="h-3.5 w-3.5" /> Archivieren</button>
          </> : <Link href={"/portal/leads/" + contact.converted_lead_id} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 text-xs font-extrabold text-white">Lead öffnen <ArrowRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </article>)}
    </section>

    {visible.length === 0 && <Card><p className="py-8 text-center text-sm text-steel">Keine passenden Kontakte gefunden.</p></Card>}
  </div>;
}
