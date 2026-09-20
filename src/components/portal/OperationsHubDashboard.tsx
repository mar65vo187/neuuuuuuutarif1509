"use client";

import {
  Award, BookOpenCheck, CheckCircle2, CircleDollarSign, FileDown, FileUp,
  GraduationCap, Loader2, Plus, ReceiptText, ShieldCheck, Target, UsersRound, WalletCards,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Team = { id: number; name: string; leadEmployeeId: number | null; leadName: string | null; active: boolean; members: Array<{ teamId: number; employeeId: number; name: string; email: string; active: boolean }> };
type Incentive = { id: number; title: string; description: string; goalType: string; goalValue: string; rewardType: string; rewardDescription: string; budget: string | null; startsAt: string; endsAt: string; audience: string; audienceLabel: string; progress: number };
type Training = { id: number; title: string; category: string; description: string; content: string; productId: number | null; productName: string | null; required: boolean; validMonths: number | null; active: boolean };
type Completion = { moduleId: number; employeeId: number; employeeName: string; status: string; completedAt: string; expiresAt: string | null; note: string; certificateCode: string | null };
type Benefit = { id: number; employeeId: number; employeeName: string; benefitKey: string; label: string; status: string; details: string; validFrom: string | null; validTo: string | null };
type DocumentRow = { id: number; category: string; title: string; fileName: string; contentType: string; digest: string; sizeBytes: number; version: number; productId: number | null; productName: string | null; providerId: number | null; providerName: string | null; visibility: string; createdAt: string };
type Reconciliation = { id: number; providerId: number | null; type: string; status: string; expectedAmount: string | null; reportedAmount: string | null; differenceAmount: string | null; reference: string | null; note: string | null; createdAt: string };
type Data = {
  owner: boolean;
  admin: boolean;
  teams: Team[];
  incentives: Incentive[];
  training: Training[];
  completions: Completion[];
  benefits: Benefit[];
  documents: DocumentRow[];
  employees: Array<{ id: number; name: string; email: string }>;
  products: Array<{ id: number; name: string; providerId: number }>;
  providers: Array<{ id: number; name: string }>;
  reconciliation: Reconciliation[];
  ownerCockpit: null | {
    providerGross: number; confirmed: number; paid: number; storno: number; poolBalance: number; activeIncentives: number; teamCount: number; openReconciliation: number;
    imports: Array<{ id: number; providerName: string; sourceName: string; rowCount: number; matchedCount: number; issueCount: number; createdAt: string }>;
  };
};

const money = (value: number) => value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("de-DE") : "–";
const pct = (value: number, goal: number) => Math.max(0, Math.min(100, goal > 0 ? value / goal * 100 : 0));

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (response.status === 401) { window.location.replace("/portal/login?next=%2Fportal%2Fbetrieb"); throw new Error("Bitte erneut anmelden."); }
  if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Speichern fehlgeschlagen.");
}

function parseReconciliationCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (line: string) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]).map((value) => value.toLowerCase().replace(/[^a-z0-9äöüß]/g, ""));
  const index = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const order = index("auftragsid", "externeauftragsid", "externalorderid", "auftragsnummer", "referenz");
  const amount = index("betrag", "provision", "reportedamount", "auszahlung");
  const reference = index("providerreferenz", "reference", "abrechnungsreferenz");
  if (order < 0 || amount < 0) return [];
  return lines.slice(1).map(split).map((cells) => ({
    externalOrderId: cells[order] ?? "",
    reportedAmount: Number((cells[amount] ?? "0").replace(/\./g, "").replace(",", ".")),
    reference: reference >= 0 ? cells[reference] || undefined : undefined,
  })).filter((row) => row.externalOrderId && Number.isFinite(row.reportedAmount));
}

export function OperationsHubDashboard({ data, currentUserId }: { data: Data; currentUserId: number }) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [reconciliationRows, setReconciliationRows] = useState<Array<{ externalOrderId: string; reportedAmount: number; reference?: string }>>([]);
  const [reconciliationName, setReconciliationName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>, key: string, url: string, build: (form: FormData) => unknown) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(key); setMessage(null);
    const formElement = event.currentTarget;
    try {
      await postJson(url, build(new FormData(formElement)));
      setMessage({ type: "success", text: "Gespeichert und revisionsfähig protokolliert." });
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
    } finally { busyRef.current = false; setBusy(null); }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy("document"); setMessage(null);
    const formElement = event.currentTarget;
    try {
      const response = await fetch("/api/portal/admin/operations/documents", { method: "POST", credentials: "same-origin", body: new FormData(formElement), signal: AbortSignal.timeout(30000) });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Dokument konnte nicht gespeichert werden.");
      setMessage({ type: "success", text: "Dokument hochgeladen." });
      formElement.reset(); router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload fehlgeschlagen." });
    } finally { busyRef.current = false; setBusy(null); }
  }

  const ownCompletions = useMemo(() => new Map(data.completions.filter((row) => row.employeeId === currentUserId).map((row) => [row.moduleId, row])), [data.completions, currentUserId]);
  const ownBenefits = data.benefits.filter((row) => row.employeeId === currentUserId);

  return <div className="space-y-6">
    {message && <p role={message.type === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-[13.5px] ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message.text}</p>}

    {data.owner && data.ownerCockpit && <section className="rounded-[26px] border border-line bg-ink p-6 text-white sm:p-8">
      <div className="flex items-end justify-between gap-4"><div><p className="eyebrow text-electric-soft">Owner Cockpit</p><h2 className="mt-2 text-[23px] font-extrabold">Betrieb auf einen Blick</h2></div><ShieldCheck className="h-7 w-7 text-electric-soft" /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: "Provider erwartet", value: money(data.ownerCockpit.providerGross), Icon: CircleDollarSign },
        { label: "Provider bestätigt", value: money(data.ownerCockpit.confirmed), Icon: ReceiptText },
        { label: "Provider ausgezahlt", value: money(data.ownerCockpit.paid), Icon: WalletCards },
        { label: "Benefit-Pool verfügbar", value: money(data.ownerCockpit.poolBalance), Icon: Award },
        { label: "Teams", value: String(data.ownerCockpit.teamCount), Icon: UsersRound },
        { label: "Aktive Incentives", value: String(data.ownerCockpit.activeIncentives), Icon: Target },
        { label: "Stornos", value: String(data.ownerCockpit.storno), Icon: ShieldCheck },
        { label: "Offene Abweichungen", value: String(data.ownerCockpit.openReconciliation), Icon: ReceiptText },
      ].map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between"><p className="text-[11.5px] text-silver">{label}</p><Icon className="h-4 w-4 text-electric-soft" /></div><p className="mt-2 text-[21px] font-extrabold">{value}</p></div>)}</div>
    </section>}

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Teamstruktur</h2><p className="text-[12.5px] text-steel">Wer arbeitet in welchem Team und wer führt es?</p></div></div>
        <div className="mt-5 space-y-3">{data.teams.length ? data.teams.map((team) => <div key={team.id} className="rounded-2xl border border-line bg-paper p-4"><div className="flex items-center justify-between gap-3"><p className="font-extrabold">{team.name}</p><span className="text-[11.5px] text-steel">{team.members.length} Mitglieder</span></div><p className="mt-1 text-[12px] text-steel">Teamlead: {team.leadName || "noch nicht zugewiesen"}</p><div className="mt-3 flex flex-wrap gap-2">{team.members.map((member) => <span key={member.employeeId} className="chip border-line bg-white">{member.name}</span>)}</div></div>) : <p className="text-[13px] text-steel">Noch keine Teams angelegt.</p>}</div>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><Target className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Aktuelle Incentives</h2><p className="text-[12.5px] text-steel">Klare Ziele und nachvollziehbarer Fortschritt.</p></div></div>
        <div className="mt-5 space-y-4">{data.incentives.length ? data.incentives.map((item) => {
          const goal = Number(item.goalValue);
          const progress = pct(item.progress, goal);
          const formatted = item.goalType === "commission" ? money(item.progress) : new Intl.NumberFormat("de-DE").format(item.progress);
          const goalText = item.goalType === "commission" ? money(goal) : new Intl.NumberFormat("de-DE").format(goal);
          return <div key={item.id} className="rounded-2xl border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-extrabold">{item.title}</p><p className="mt-1 text-[12px] text-steel">{date(item.startsAt)} – {date(item.endsAt)} · {item.audienceLabel}</p></div><span className="chip border-electric/20 bg-electric/5 text-electric-deep">{item.rewardDescription}</span></div>{item.description && <p className="mt-3 text-[12.5px] leading-relaxed text-steel">{item.description}</p>}<div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-electric" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[11.5px] text-steel"><span>{formatted}</span><span>Ziel {goalText}</span></div></div>;
        }) : <p className="text-[13px] text-steel">Aktuell kein Incentive aktiv.</p>}</div>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Learning Center</h2><p className="text-[12.5px] text-steel">Pflichtschulungen und Produktfreigaben.</p></div></div>
        <div className="mt-5 space-y-3">{data.training.length ? data.training.map((module) => {
          const completion = ownCompletions.get(module.id);
          const valid = completion?.status === "completed" && (!completion.expiresAt || new Date(completion.expiresAt) > new Date());
          return <details key={module.id} className="rounded-2xl border border-line bg-paper p-4"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{module.title}</p><p className="mt-1 text-[11.5px] text-steel">{module.category}{module.productName ? ` · ${module.productName}` : ""}</p></div><span className={`chip ${valid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : module.required ? "border-amber-200 bg-amber-50 text-amber-800" : "border-line bg-white"}`}>{valid ? "Freigegeben" : module.required ? "Pflicht" : "Optional"}</span></div></summary><div className="mt-4 border-t border-line pt-4"><p className="text-[13px] leading-relaxed text-steel">{module.description}</p>{module.content && <div className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed">{module.content}</div>}{completion && <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-steel"><span>Status: {completion.status} · abgeschlossen {date(completion.completedAt)}{completion.expiresAt ? ` · gültig bis ${date(completion.expiresAt)}` : ""}</span>{completion.status === "completed" && completion.certificateCode && <a href={`/api/portal/training/certificates/${encodeURIComponent(completion.certificateCode)}`} target="_blank" rel="noreferrer" className="font-bold text-electric-deep hover:underline">Schulungsnachweis öffnen</a>}</div>}</div></details>;
        }) : <p className="text-[13px] text-steel">Noch keine Schulungsmodule hinterlegt.</p>}</div>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><Award className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Ihre Benefits</h2><p className="text-[12.5px] text-steel">Persönlich freigeschaltete Programme.</p></div></div>
        <div className="mt-5 space-y-3">{ownBenefits.length ? ownBenefits.map((benefit) => <div key={benefit.id} className="rounded-2xl border border-line bg-paper p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold">{benefit.label}</p><span className="chip border-line bg-white">{benefit.status}</span></div>{benefit.details && <p className="mt-2 text-[12.5px] leading-relaxed text-steel">{benefit.details}</p>}<p className="mt-2 text-[11px] text-steel">{benefit.validFrom ? `ab ${date(benefit.validFrom)}` : ""}{benefit.validTo ? ` bis ${date(benefit.validTo)}` : ""}</p></div>) : <p className="text-[13px] text-steel">Noch keine individuellen Benefits hinterlegt.</p>}</div>
      </div>
    </section>

    <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Dokumentcenter</h2><p className="text-[12.5px] text-steel">Aktuelle Verträge, Preislisten, Produktunterlagen und Schulungsdokumente.</p></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[12.5px]"><thead><tr className="border-b border-line text-steel"><th className="pb-3 font-semibold">Dokument</th><th className="pb-3 font-semibold">Kategorie</th><th className="pb-3 font-semibold">Zuordnung</th><th className="pb-3 font-semibold">Version</th><th className="pb-3 font-semibold">Datum</th><th className="pb-3 text-right font-semibold">Datei</th></tr></thead><tbody>{data.documents.map((doc) => <tr key={doc.id} className="border-b border-line last:border-0"><td className="py-3 font-semibold">{doc.title}</td><td className="py-3 text-steel">{doc.category}</td><td className="py-3 text-steel">{doc.productName || doc.providerName || "Allgemein"}</td><td className="py-3">v{doc.version}</td><td className="py-3 text-steel">{date(doc.createdAt)}</td><td className="py-3 text-right"><a href={`/api/portal/documents/${doc.id}`} className="inline-flex items-center gap-1 font-semibold text-electric-deep hover:underline"><FileDown className="h-3.5 w-3.5" /> {doc.fileName}</a></td></tr>)}</tbody></table>{!data.documents.length && <p className="py-5 text-[13px] text-steel">Noch keine Dokumente vorhanden.</p>}</div>
    </section>

    {data.owner && <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Provider-Abgleich</h2><p className="text-[12.5px] text-steel">Offene Differenzen aus importierten Provider-Abrechnungen.</p></div></div>
      <div className="mt-5 space-y-2">{data.reconciliation.length ? data.reconciliation.map((item) => <div key={item.id} className="grid gap-2 rounded-2xl border border-line bg-paper p-4 sm:grid-cols-[1fr_auto]"><div><p className="font-bold">{item.type} · {item.reference || "ohne Referenz"}</p><p className="mt-1 text-[12px] text-steel">{item.note || "Abweichung prüfen."}</p></div><div className="text-right text-[12px]"><p>Erwartet: <strong>{money(Number(item.expectedAmount ?? 0))}</strong></p><p>Gemeldet: <strong>{money(Number(item.reportedAmount ?? 0))}</strong></p><p className="text-steel">Differenz: {money(Number(item.differenceAmount ?? 0))}</p></div></div>) : <p className="text-[13px] text-steel">Keine offenen Abweichungen.</p>}</div>
    </section>}

    {data.admin && <section className="space-y-5">
      <div><p className="eyebrow text-electric-deep">Administration</p><h2 className="mt-2 text-[21px] font-extrabold">Betrieb steuern</h2></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <h3 className="text-[16px] font-extrabold">Teams verwalten</h3>
          <form onSubmit={(event) => submit(event, "team-create", "/api/portal/admin/operations/team", (form) => ({ action: "create", name: form.get("name"), leadEmployeeId: form.get("leadEmployeeId") ? Number(form.get("leadEmployeeId")) : null }))} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="label">Teamname<input name="name" required maxLength={160} className="field" /></label><label className="label">Teamlead<select name="leadEmployeeId" className="field"><option value="">Später</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><button disabled={busy !== null} className="sm:col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white">{busy === "team-create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Team anlegen</button></form>
          <form onSubmit={(event) => submit(event, "team-assign", "/api/portal/admin/operations/team", (form) => ({ action: "assign", teamId: Number(form.get("teamId")), employeeId: Number(form.get("employeeId")) }))} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="label">Team<select name="teamId" required className="field"><option value="">Auswählen</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="label">Mitarbeiter<select name="employeeId" required className="field"><option value="">Auswählen</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><button disabled={busy !== null} className="sm:col-span-2 inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold">Mitarbeiter zuweisen</button></form>
        </div>

        <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <h3 className="text-[16px] font-extrabold">Schulungsmodul</h3>
          <form onSubmit={(event) => submit(event, "training-create", "/api/portal/admin/operations/training", (form) => ({ action: "create", title: form.get("title"), category: form.get("category"), description: form.get("description"), content: form.get("content"), productId: form.get("productId") ? Number(form.get("productId")) : null, required: form.get("required") === "on", validMonths: form.get("validMonths") ? Number(form.get("validMonths")) : null }))} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="label">Titel<input name="title" required className="field" /></label><label className="label">Kategorie<input name="category" required className="field" /></label><label className="label sm:col-span-2">Produkt<select name="productId" className="field"><option value="">Allgemein</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="label sm:col-span-2">Beschreibung<textarea name="description" rows={2} className="field" /></label><label className="label sm:col-span-2">Schulungsinhalt<textarea name="content" rows={4} className="field" /></label><label className="label">Gültigkeit Monate<input name="validMonths" type="number" min={1} max={120} className="field" /></label><label className="flex items-center gap-2 self-end rounded-xl border border-line p-3 text-[13px] font-semibold"><input name="required" type="checkbox" /> Pflichtschulung</label><button disabled={busy !== null} className="sm:col-span-2 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white">Modul speichern</button></form>
        </div>

        <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <h3 className="text-[16px] font-extrabold">Schulung freigeben / widerrufen</h3>
          <form onSubmit={(event) => submit(event, "training-complete", "/api/portal/admin/operations/training", (form) => ({ action: form.get("action"), moduleId: Number(form.get("moduleId")), employeeId: Number(form.get("employeeId")), note: form.get("note") }))} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="label">Schulung<select name="moduleId" required className="field"><option value="">Auswählen</option>{data.training.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className="label">Mitarbeiter<select name="employeeId" required className="field"><option value="">Auswählen</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="label">Aktion<select name="action" className="field"><option value="complete">Freigeben</option><option value="revoke">Widerrufen</option></select></label><label className="label">Notiz<input name="note" maxLength={1000} className="field" /></label><button disabled={busy !== null} className="sm:col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold"><CheckCircle2 className="h-4 w-4" /> Status speichern</button></form>
        </div>

        <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <h3 className="text-[16px] font-extrabold">Dokument hochladen</h3>
          <form onSubmit={uploadDocument} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="label">Titel<input name="title" required maxLength={220} className="field" /></label><label className="label">Kategorie<input name="category" required maxLength={100} placeholder="Preislisten, Schulung, Vertrag…" className="field" /></label><label className="label">Produkt<select name="productId" className="field"><option value="">Allgemein</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="label">Partner<select name="providerId" className="field"><option value="">Allgemein</option>{data.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label className="label">Sichtbarkeit<select name="visibility" className="field"><option value="team">Team</option><option value="admin">Nur Admins</option>{data.owner && <option value="owner">Nur Owner</option>}</select></label><label className="label">Datei · max. 5 MB<input name="file" type="file" required className="field" /></label><button disabled={busy !== null} className="sm:col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white">{busy === "document" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Dokument hochladen</button></form>
        </div>
      </div>

      {data.owner && <div className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={(event) => submit(event, "incentive", "/api/portal/admin/operations/incentives", (form) => ({ title: form.get("title"), description: form.get("description"), goalType: form.get("goalType"), goalValue: Number(form.get("goalValue")), rewardType: form.get("rewardType"), rewardDescription: form.get("rewardDescription"), budget: form.get("budget") ? Number(form.get("budget")) : null, startsAt: new Date(String(form.get("startsAt")) + "T00:00:00.000Z").toISOString(), endsAt: new Date(String(form.get("endsAt")) + "T23:59:59.999Z").toISOString(), audience: form.get("audience") }))} className="rounded-[24px] border border-line bg-white p-5"><h3 className="font-extrabold">Incentive anlegen</h3><div className="mt-4 grid gap-3"><label className="label">Titel<input name="title" required className="field" /></label><label className="label">Beschreibung<textarea name="description" rows={2} className="field" /></label><label className="label">Ziel<select name="goalType" className="field"><option value="orders">Abschlüsse</option><option value="commission">Provision</option><option value="team_orders">Team-Abschlüsse</option></select></label><label className="label">Zielwert<input name="goalValue" type="number" min="0.01" step="0.01" required className="field" /></label><label className="label">Belohnungsart<input name="rewardType" defaultValue="bonus" className="field" /></label><label className="label">Belohnung<input name="rewardDescription" required className="field" placeholder="z. B. 500 € Bonus / Teamreise" /></label><label className="label">Budget €<input name="budget" type="number" min="0" step="0.01" className="field" /></label><div className="grid grid-cols-2 gap-2"><label className="label">Start<input name="startsAt" type="date" required className="field" /></label><label className="label">Ende<input name="endsAt" type="date" required className="field" /></label></div><label className="label">Zielgruppe<select name="audience" defaultValue="all" className="field"><option value="all">Alle · individueller Fortschritt</option><optgroup label="Teams">{data.teams.map((team) => <option key={`team-${team.id}`} value={`team:${team.id}`}>{team.name}</option>)}</optgroup><optgroup label="Mitarbeiter">{data.employees.map((employee) => <option key={`employee-${employee.id}`} value={`employee:${employee.id}`}>{employee.name}</option>)}</optgroup></select></label></div><button disabled={busy !== null} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">Incentive speichern</button></form>

        <form onSubmit={(event) => submit(event, "benefit", "/api/portal/admin/operations/benefits", (form) => ({ employeeId: Number(form.get("employeeId")), benefitKey: form.get("benefitKey"), label: form.get("label"), status: form.get("status"), details: form.get("details"), validFrom: form.get("validFrom") ? new Date(String(form.get("validFrom")) + "T00:00:00.000Z").toISOString() : null, validTo: form.get("validTo") ? new Date(String(form.get("validTo")) + "T23:59:59.999Z").toISOString() : null }))} className="rounded-[24px] border border-line bg-white p-5"><h3 className="font-extrabold">Benefit zuweisen</h3><div className="mt-4 grid gap-3"><label className="label">Mitarbeiter<select name="employeeId" required className="field"><option value="">Auswählen</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="label">Benefit<select name="benefitKey" className="field"><option value="wellpass">Wellpass</option><option value="company_car">Firmenwagen</option><option value="travel">Teamreisen</option><option value="retirement">Vorsorge</option><option value="training">Weiterbildung</option><option value="special_bonus">Sonderbonus</option></select></label><label className="label">Anzeigename<input name="label" required placeholder="z. B. Wellpass" className="field" /></label><label className="label">Status<select name="status" className="field"><option value="eligible">Berechtigt</option><option value="active">Aktiv</option><option value="paused">Pausiert</option><option value="ended">Beendet</option></select></label><label className="label">Details<textarea name="details" rows={3} className="field" /></label><div className="grid grid-cols-2 gap-2"><label className="label">Ab<input name="validFrom" type="date" className="field" /></label><label className="label">Bis<input name="validTo" type="date" className="field" /></label></div></div><button disabled={busy !== null} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">Benefit speichern</button></form>

        <form onSubmit={(event) => submit(event, "reconciliation", "/api/portal/admin/operations/reconciliation", (form) => ({ providerId: Number(form.get("providerId")), sourceName: reconciliationName || form.get("sourceName"), rows: reconciliationRows.length ? reconciliationRows : String(form.get("manualRows") ?? "").split(/\r?\n/).filter(Boolean).map((line) => { const [externalOrderId, amount, reference] = line.split("|").map((part) => part.trim()); return { externalOrderId, reportedAmount: Number((amount || "0").replace(",", ".")), reference: reference || undefined }; }) }))} className="rounded-[24px] border border-line bg-white p-5"><h3 className="font-extrabold">Provider-Abrechnung</h3><div className="mt-4 grid gap-3"><label className="label">Provider<select name="providerId" required className="field"><option value="">Auswählen</option>{data.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label className="label">Bezeichnung<input name="sourceName" maxLength={240} placeholder="Abrechnung September 2026" className="field" /></label><label className="label">CSV<input type="file" accept=".csv,text/csv" className="field" onChange={(event) => { const file = event.target.files?.[0]; setReconciliationName(file?.name ?? ""); setReconciliationRows([]); if (file) void file.text().then((content) => setReconciliationRows(parseReconciliationCsv(content))); }} /></label>{reconciliationRows.length > 0 && <p className="rounded-xl bg-emerald-50 p-3 text-[12px] text-emerald-800">{reconciliationRows.length} Zeilen erkannt.</p>}<label className="label">Alternativ: ExterneID|Betrag|Referenz<textarea name="manualRows" rows={4} className="field" /></label></div><button disabled={busy !== null} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">Abrechnung abgleichen</button></form>
      </div>}
    </section>}
  </div>;
}
