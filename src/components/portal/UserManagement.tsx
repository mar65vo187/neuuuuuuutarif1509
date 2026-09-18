"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Card } from "./ui";
import { AdvisorAvatar } from "@/components/advisors/AdvisorCard";
import { normalizeSlug, type AdminAccount } from "@/lib/admin-validation";
import { SERVICES } from "@/lib/content";

type FormState = {
  name: string; email: string; password: string; role: "admin" | "berater"; active: boolean;
  hasProfile: boolean; slug: string; title: string; city: string; region: string; regions: string;
  topics: string; bio: string; quote: string; phone: string; whatsapp: string; publicEmail: string;
  initials: string; isFounder: boolean; profileActive: boolean; sortOrder: string;
};

const emptyForm = (): FormState => ({
  name: "", email: "", password: "", role: "berater", active: true, hasProfile: false,
  slug: "", title: "Berater", city: "", region: "Deutschlandweit", regions: "Deutschlandweit (digital)",
  topics: "", bio: "", quote: "", phone: "", whatsapp: "", publicEmail: "", initials: "",
  isFounder: false, profileActive: true, sortOrder: "100",
});

function formFromAccount(account: AdminAccount): FormState {
  const profile = account.advisor;
  return { ...emptyForm(), name: account.name, email: account.email, role: account.role, active: account.active,
    hasProfile: Boolean(profile), slug: profile?.slug ?? "", title: profile?.title ?? "Berater",
    city: profile?.city ?? "", region: profile?.region ?? "Deutschlandweit", regions: profile?.regions.join("\n") ?? "Deutschlandweit (digital)",
    topics: profile?.topics.join("\n") ?? "", bio: profile?.bio ?? "", quote: profile?.quote ?? "",
    phone: profile?.phone ?? "", whatsapp: profile?.whatsapp ?? "", publicEmail: profile?.email ?? "",
    initials: profile?.initials ?? "", isFounder: profile?.isFounder ?? false, profileActive: profile?.active ?? true,
    sortOrder: String(profile?.sortOrder ?? 100),
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(30000) });
  const body = await response.json().catch(() => null) as ({ ok?: boolean; error?: string } & T) | null;
  if (response.status === 401) throw new Error("Die Sitzung ist abgelaufen. Bitte erneut anmelden; deine Eingaben bleiben bis dahin im Formular.");
  if (!response.ok || !body?.ok) throw new Error(body?.error ?? "Die Anfrage konnte nicht verarbeitet werden. Bitte erneut versuchen.");
  return body;
}

export function UserManagement({ currentUserId, initialAccounts, initialError }: { currentUserId: number; initialAccounts: AdminAccount[]; initialError: string | null }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const selected = accounts.find((account) => account.id === selectedId);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTopic = (topic: string) => {
    const topics = form.topics.split("\n").map((entry) => entry.trim()).filter(Boolean);
    update("topics", topics.includes(topic) ? topics.filter((entry) => entry !== topic).join("\n") : [...topics, topic].join("\n"));
  };

  function choose(account?: AdminAccount) {
    setDeleteConfirmation(false);
    setSelectedId(account?.id ?? null);
    setForm(account ? formFromAccount(account) : emptyForm());
    setImage(null);
    if (fileInput.current) fileInput.current.value = "";
    setError(null);
    setSuccess(null);
  }

  function selectImage(file: File | null) {
    if (saving.current) return;
    if (file && (file.size === 0 || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Bitte ein JPG-, PNG- oder WebP-Bild mit höchstens 5 MB auswählen.");
      setImage(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setImage(file); setError(null); setSuccess(null);
  }

  async function reload() {
    const body = await api<{ users: AdminAccount[] }>("/api/portal/admin/users");
    setAccounts(body.users);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true); setError(null); setSuccess(null);
    let accountSaved = false;
    try {
      if (selectedId === currentUserId && form.password && image) throw new Error("Bitte das Profilbild zuerst speichern und das eigene Passwort anschließend separat ändern.");
      const lines = (value: string) => [...new Set(value.split(/\n|;/).map((entry) => entry.trim()).filter(Boolean))];
      const data = {
        name: form.name, email: form.email, role: form.role, active: form.active,
        ...(form.password || !selectedId ? { password: form.password } : {}),
        advisor: form.hasProfile ? {
          slug: form.slug, title: form.title, city: form.city, region: form.region,
          regions: lines(form.regions), topics: lines(form.topics), bio: form.bio, quote: form.quote,
          phone: form.phone, whatsapp: form.whatsapp, email: form.publicEmail, initials: form.initials,
          isFounder: form.isFounder, active: form.profileActive, sortOrder: Number(form.sortOrder),
        } : null,
      };
      const result = await api<{ user: Omit<AdminAccount, "advisor">; signInAgain?: boolean }>(
        `/api/portal/admin/users${selectedId ? `/${selectedId}` : ""}`,
        { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
      );
      accountSaved = true;
      setSelectedId(result.user.id);
      update("password", "");
      if (result.signInAgain) { window.location.replace("/portal/login?next=/portal/verwaltung"); return; }
      if (image && result.user.advisorId) {
        const upload = new FormData(); upload.append("image", image);
        await api(`/api/portal/admin/advisors/${result.user.advisorId}/image`, { method: "POST", body: upload });
        setImage(null);
        if (fileInput.current) fileInput.current.value = "";
      }
      await reload();
      setSuccess("Benutzer und Beraterprofil wurden gespeichert." );
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : "Verbindung fehlgeschlagen. Bitte erneut versuchen.";
      setError(accountSaved ? `Der Benutzer wurde gespeichert. ${message}` : message);
      if (accountSaved) await reload().catch(() => undefined);
    } finally { saving.current = false; setBusy(false); }
  }

  async function removeAccount() {
    if (!selected || selected.id === currentUserId || saving.current || !deleteConfirmation) return;
    const id = selected.id;
    const hadProfile = Boolean(selected.advisorId);
    saving.current = true;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await api<{ profileDeleted: boolean }>(`/api/portal/admin/users/${id}`, { method: "DELETE" });
      setAccounts((current) => current.filter((account) => account.id !== id));
      choose();
      setSuccess(`Der Portalzugang wurde gelöscht.${result.profileDeleted ? " Das zugehörige Beraterprofil und Profilbild wurden gelöscht." : hadProfile ? " Ein gemeinsam genutztes Beraterprofil bleibt erhalten." : ""} Zugeordnete Kundenanfragen wurden dir übertragen. Notizen und Chatnachrichten bleiben erhalten.`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Der Benutzer konnte nicht gelöscht werden."); }
    finally { saving.current = false; setBusy(false); }
  }

  async function removeImage() {
    if (!selected?.advisorId || saving.current) return;
    saving.current = true;
    setBusy(true); setError(null); setSuccess(null);
    try {
      await api(`/api/portal/admin/advisors/${selected.advisorId}/image`, { method: "DELETE" });
      setImage(null); if (fileInput.current) fileInput.current.value = "";
      await reload(); setSuccess("Das Profilbild wurde entfernt.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Das Bild konnte nicht entfernt werden."); }
    finally { saving.current = false; setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-[26px] font-extrabold text-ink">Benutzer & Berater</h1><p className="mt-1 text-[14px] text-steel">Portalzugänge und öffentliche Beraterprofile verwalten.</p></div>
        <Link href="/portal" className="text-[13.5px] font-semibold text-electric-deep">Zur Übersicht</Link>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">{success}</p>}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="managed-user" className="label">Benutzer auswählen</label>
          <select id="managed-user" className="field flex-1" value={selectedId ?? ""} disabled={busy} onChange={(event) => choose(accounts.find((account) => account.id === Number(event.target.value)))}>
            <option value="">Neuen Benutzer anlegen</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.email}{account.active ? "" : " · deaktiviert"}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={() => choose()} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold text-ink hover:border-ink/40 disabled:opacity-50"><UserPlus className="h-4 w-4" /> Neu</button>
          <button type="button" disabled={busy} className="text-[13.5px] font-semibold text-electric-deep" onClick={async () => { setBusy(true); setError(null); try { await reload(); } catch (problem) { setError(problem instanceof Error ? problem.message : "Laden fehlgeschlagen."); } finally { saving.current = false; setBusy(false); } }}>Aktualisieren</button>
        </div>
      </Card>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={busy} className="space-y-6">
          <Card>
            <h2 className="text-[18px] font-extrabold text-ink">{selectedId ? "Portalzugang bearbeiten" : "Portalzugang anlegen"}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="label">Vollständiger Name<input required maxLength={120} className="field" value={form.name} onChange={(event) => update("name", event.target.value)} onBlur={() => { if (!form.slug) update("slug", normalizeSlug(form.name)); if (!form.initials) update("initials", form.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 3).join("").toUpperCase()); }} /></label>
              <label className="label">E-Mail für die Anmeldung<input required type="email" maxLength={200} autoComplete="off" className="field" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
              <label className="label">{selectedId ? "Neues Passwort (leer = unverändert)" : "Passwort (mindestens 12 Zeichen)"}<input required={!selectedId} type="password" minLength={12} maxLength={200} autoComplete="new-password" className="field" value={form.password} onChange={(event) => update("password", event.target.value)} /></label>
              <label className="label">Rolle<select className="field" value={form.role} disabled={selectedId === currentUserId} onChange={(event) => update("role", event.target.value as FormState["role"])}><option value="berater">Mitarbeiter</option><option value="admin">Administrator</option></select></label>
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={form.active} disabled={selectedId === currentUserId} onChange={(event) => update("active", event.target.checked)} /> Portalzugang aktiv</label>
            <p className="mt-2 text-[12.5px] text-steel">Mitarbeiter können im Portal Anfragen bearbeiten. Nur Administratoren dürfen Benutzer, Beraterprofile und Profilbilder verwalten.</p>
          </Card>
          <Card>
            <label className="inline-flex items-center gap-2 text-[18px] font-extrabold text-ink"><input type="checkbox" checked={form.hasProfile} disabled={Boolean(selected?.advisorId)} onChange={(event) => { update("hasProfile", event.target.checked); if (!event.target.checked) { setImage(null); if (fileInput.current) fileInput.current.value = ""; } }} /> Öffentliches Beraterprofil</label>
            <p className="mt-2 text-[12.5px] text-steel">Die folgenden Angaben werden auf der Website angezeigt, sobald das Profil öffentlich sichtbar ist.</p>
            {form.hasProfile && <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="label">Profil-Link (/berater/…)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} className="field" value={form.slug} onChange={(event) => update("slug", event.target.value)} /></label>
                <label className="label">Position / Titel<input required maxLength={120} className="field" value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
                <label className="label">Stadt<input required maxLength={120} className="field" value={form.city} onChange={(event) => update("city", event.target.value)} /></label>
                <label className="label">Region<input required maxLength={120} className="field" value={form.region} onChange={(event) => update("region", event.target.value)} /></label>
                <label className="label">Beratungsorte (ein Ort pro Zeile)<textarea required rows={3} className="field" value={form.regions} onChange={(event) => update("regions", event.target.value)} /></label>
                <div className="sm:col-span-2">
                  <p className="label">Themenbereiche auswählen</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SERVICES.map((service) => {
                      const selectedTopic = form.topics.split("\n").map((entry) => entry.trim()).includes(service.name);
                      return <label key={service.key} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[13.5px] transition-colors ${selectedTopic ? "border-electric bg-electric/5" : "border-line bg-white hover:border-ink/30"}`}><input type="checkbox" checked={selectedTopic} onChange={() => toggleTopic(service.name)} />{service.name}</label>;
                    })}
                  </div>
                  <label className="label mt-3">Weitere Schwerpunkte (optional, ein Thema pro Zeile)<textarea rows={2} className="field" value={form.topics.split("\n").filter((topic) => !SERVICES.some((service) => service.name === topic.trim())).join("\n")} onChange={(event) => { const selected = form.topics.split("\n").filter((topic) => SERVICES.some((service) => service.name === topic.trim())); update("topics", [...selected, ...event.target.value.split("\n")].filter(Boolean).join("\n")); }} /></label>
                </div>
                <label className="label">Telefon<input maxLength={40} type="tel" className="field" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                <label className="label">WhatsApp (z. B. 4915782301076)<input maxLength={20} inputMode="numeric" className="field" value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} /></label>
                <label className="label">Öffentliche E-Mail (optional)<input type="email" maxLength={200} className="field" value={form.publicEmail} onChange={(event) => update("publicEmail", event.target.value)} /></label>
                <label className="label">Initialen<input required maxLength={4} className="field" value={form.initials} onChange={(event) => update("initials", event.target.value)} /></label>
                <label className="label">Reihenfolge<input type="number" required min={0} max={99999} className="field" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} /></label>
              </div>
              <label className="label mt-4">Kurzvorstellung<textarea required minLength={20} maxLength={2000} rows={4} className="field" value={form.bio} onChange={(event) => update("bio", event.target.value)} /></label>
              <label className="label mt-4">Persönliches Zitat (optional)<textarea maxLength={500} rows={2} className="field" value={form.quote} onChange={(event) => update("quote", event.target.value)} /></label>
              <div className="mt-4 flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={form.profileActive} onChange={(event) => update("profileActive", event.target.checked)} /> Profil öffentlich sichtbar</label>
                <label className="inline-flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={form.isFounder} onChange={(event) => update("isFounder", event.target.checked)} /> Gründer</label>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4" onDragOver={(event) => { event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (saving.current) return; if (event.dataTransfer.files.length !== 1) { setError("Bitte genau ein Bild ablegen."); return; } const file = event.dataTransfer.files[0]; selectImage(file); if (fileInput.current && file.size > 0 && file.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) fileInput.current.files = event.dataTransfer.files; }}>
                <AdvisorAvatar initials={form.initials || "?"} imageUrl={selected?.advisor?.active ? selected.advisor.imageUrl : null} />
                <label className="label">Profilbild (JPG, PNG oder WebP; maximal 5 MB)<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="field" onChange={(event) => selectImage(event.target.files?.[0] ?? null)} /></label>
                {selected?.advisor?.imageUrl && <button type="button" onClick={removeImage} className="text-[13.5px] font-semibold text-electric-deep">Bild entfernen</button>}
              </div>
              {selected?.advisor?.active && <Link href={`/berater/${selected.advisor.slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-[13.5px] font-semibold text-electric-deep">Öffentliches Profil ansehen</Link>}
            </>}
          </Card>
          <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} {selectedId ? "Änderungen speichern" : "Benutzer anlegen"}</button>
        </fieldset>
      </form>
      {selected && selected.id !== currentUserId && <Card>
        <h2 className="text-[18px] font-extrabold text-ink">Benutzer löschen</h2>
        <p className="mt-2 text-[12.5px] text-steel">Der Portalzugang wird endgültig gelöscht; bestehende Sitzungen verlieren ihre Gültigkeit. Ein ausschließlich diesem Benutzer zugeordnetes Beraterprofil samt Bild wird gelöscht. Kundenanfragen bleiben erhalten und werden dir zugeordnet; Notizen und Chatnachrichten bleiben ohne Autorenverknüpfung erhalten. Zum vorübergehenden Sperren kannst du stattdessen „Portalzugang aktiv“ ausschalten.</p>
        <label className="mt-4 inline-flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={deleteConfirmation} disabled={busy} onChange={(event) => setDeleteConfirmation(event.target.checked)} /> Ich möchte den Zugang von {selected.name} ({selected.email}) endgültig löschen.</label>
        <button type="button" disabled={busy || !deleteConfirmation} onClick={removeAccount} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold text-ink hover:border-ink/40 disabled:opacity-50">Benutzer endgültig löschen</button>
      </Card>}
    </div>
  );
}
