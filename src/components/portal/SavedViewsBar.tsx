"use client";

import Link from "next/link";
import { BookmarkPlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type View = {
  id: number;
  name: string;
  filters: Record<string, unknown>;
  isDefault: boolean;
};

export function SavedViewsBar({
  area,
  basePath,
  views,
  currentFilters,
}: {
  area: "leads" | "orders" | "customers";
  basePath: string;
  views: View[];
  currentFilters: Record<string, string>;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<number | "save" | null>(null);
  const [error, setError] = useState("");
  const namePlaceholder = area === "customers"
    ? "z. B. Reviews diese Woche"
    : area === "orders"
      ? "z. B. Provider-Prüfung"
      : "z. B. Neue Energie-Leads";

  function href(filters: Record<string, unknown>) {
    const params = new URLSearchParams();
    for (const [key, raw] of Object.entries(filters)) {
      if (typeof raw === "string" && raw.trim()) params.set(key, raw.trim());
    }
    return params.size ? `${basePath}?${params.toString()}` : basePath;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy("save");
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/portal/views", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          name: data.get("name"),
          filters: currentFilters,
          isDefault: data.get("isDefault") === "on",
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Ansicht konnte nicht gespeichert werden.");
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ansicht konnte nicht gespeichert werden.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  async function remove(id: number) {
    if (busy !== null) return;
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/portal/views", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Ansicht konnte nicht gelöscht werden.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ansicht konnte nicht gelöscht werden.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-[18px] border border-line bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-steel">Meine Ansichten</span>
        {views.map((view) => (
          <span key={view.id} className="inline-flex items-center rounded-full border border-line bg-paper">
            <Link href={href(view.filters)} className="inline-flex h-8 items-center gap-1.5 pl-3 pr-2 text-[12px] font-semibold hover:text-electric-deep">
              {view.isDefault && <Star className="h-3 w-3 fill-current text-amber-500" aria-label="Standardansicht" />}
              {view.name}
            </Link>
            <button type="button" disabled={busy !== null} onClick={() => remove(view.id)} className="mr-1 grid h-7 w-7 place-items-center rounded-full text-steel hover:bg-white hover:text-red-700 disabled:opacity-50" aria-label={view.name + " löschen"}>
              {busy === view.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          </span>
        ))}
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-semibold text-white hover:bg-electric">
            <BookmarkPlus className="h-3.5 w-3.5" /> Aktuelle Ansicht speichern
          </summary>
          <form onSubmit={save} className="absolute left-0 z-20 mt-2 w-[min(88vw,330px)] rounded-[18px] border border-line bg-white p-4 shadow-soft">
            <label className="label">Name<input name="name" required minLength={2} maxLength={80} className="field mt-1" placeholder={namePlaceholder} /></label>
            <label className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold"><input name="isDefault" type="checkbox" className="h-4 w-4 rounded border-line" /> Als Standard markieren</label>
            <button disabled={busy !== null} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />} Speichern
            </button>
          </form>
        </details>
      </div>
      {views.length === 0 && <p className="mt-2 text-[11.5px] text-steel">Speichere häufig genutzte Filter, damit dein Team nicht täglich dieselben Ansichten neu baut.</p>}
      {error && <p role="alert" className="mt-2 text-[11.5px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
