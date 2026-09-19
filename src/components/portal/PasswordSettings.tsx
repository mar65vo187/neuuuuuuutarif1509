"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/portal/ui";

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    setError(null);
    setSuccess(false);
    if (newPassword.length < 12) return setError("Das neue Passwort muss mindestens 12 Zeichen enthalten.");
    if (newPassword !== confirmPassword) return setError("Die beiden neuen Passwörter stimmen nicht überein.");

    saving.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/portal/account/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Feinstellungen");
        return;
      }
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? "Das Passwort konnte nicht geändert werden.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Das Passwort konnte nicht geändert werden.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-electric/10 text-electric-deep"><KeyRound className="h-5 w-5" /></span>
        <div>
          <h2 className="text-[18px] font-extrabold text-ink">Passwort ändern</h2>
          <p className="text-[12.5px] text-steel">Das aktuelle Passwort wird zur Bestätigung benötigt.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 grid max-w-xl gap-4">
        <label className="label">Aktuelles Passwort<input type="password" autoComplete="current-password" required maxLength={200} className="field" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label className="label">Neues Passwort<input type="password" autoComplete="new-password" required minLength={12} maxLength={200} className="field" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label className="label">Neues Passwort wiederholen<input type="password" autoComplete="new-password" required minLength={12} maxLength={200} className="field" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">{error}</p>}
        {success && <p role="status" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Passwort erfolgreich geändert.</p>}

        <button type="submit" disabled={busy || !currentPassword || !newPassword || !confirmPassword} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Passwort speichern
        </button>
      </form>
    </Card>
  );
}
