"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardPlus, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { WorkAssistantSuggestion } from "@/lib/work-assistant";

const PRIORITY_LABEL = {
  critical: "Kritisch",
  high: "Hoch",
  normal: "Normal",
} as const;

const PRIORITY_STYLE = {
  critical: "border-red-400/20 bg-red-400/[0.08] text-red-200",
  high: "border-amber-300/20 bg-amber-300/[0.08] text-amber-100",
  normal: "border-electric/20 bg-electric/[0.06] text-electric-soft",
} as const;

export function WorkAssistantActions({
  suggestions,
  canCreateTasks,
}: {
  suggestions: WorkAssistantSuggestion[];
  canCreateTasks: boolean;
}) {
  const router = useRouter();
  const pending = useRef(new Set<string>());
  const [busyKey, setBusyKey] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function adopt(item: WorkAssistantSuggestion) {
    if (!canCreateTasks || !item.canCreateTask || pending.current.has(item.key)) return;
    pending.current.add(item.key);
    setBusyKey(item.key);
    setMessages((current) => ({ ...current, [item.key]: "" }));

    try {
      const dueAt = item.dueMinutes <= 0
        ? new Date().toISOString()
        : new Date(Date.now() + item.dueMinutes * 60_000).toISOString();
      const response = await fetch("/api/portal/tasks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.taskTitle,
          description: item.taskDescription,
          priority: item.priority === "critical" ? "critical" : item.priority === "high" ? "high" : "normal",
          dueAt,
          entityType: item.entityType,
          entityId: item.entityId,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; deduplicated?: boolean } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fassistent");
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Aufgabe konnte nicht angelegt werden.");
      setMessages((current) => ({
        ...current,
        [item.key]: json.deduplicated ? "Diese Aufgabe ist bereits offen." : "Aufgabe wurde übernommen.",
      }));
      router.refresh();
    } catch (cause) {
      setMessages((current) => ({
        ...current,
        [item.key]: cause instanceof Error ? cause.message : "Aufgabe konnte nicht angelegt werden.",
      }));
    } finally {
      pending.current.delete(item.key);
      setBusyKey("");
    }
  }

  if (!suggestions.length) {
    return (
      <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-400/[0.06] p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" />
        <h2 className="mt-3 text-[17px] font-extrabold">Keine priorisierten Einzelfälle offen.</h2>
        <p className="mx-auto mt-1 max-w-xl text-[12px] leading-relaxed text-steel">Sobald Leads, Aufträge oder Kunden konkrete Aufmerksamkeit brauchen, erscheinen sie hier mit Begründung und direktem Vorgangslink.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Erklärbare Handlungsempfehlungen">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-electric-deep">Konkrete Fälle</p>
          <h2 className="mt-1 text-[19px] font-extrabold">Empfehlung → Prüfung → bewusste Übernahme</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-steel">Jede Empfehlung zeigt den konkreten Grund. Der Assistent verändert keine Kunden- oder Auftragsdaten und legt Aufgaben nur nach Klick an.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-[10.5px] font-bold text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> Human Approval</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {suggestions.map((item, index) => (
          <article key={item.key} className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-steel">Priorität {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 truncate text-[15px] font-extrabold">{item.title}</h3>
              </div>
              <span className={"shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold " + PRIORITY_STYLE[item.priority]}>{PRIORITY_LABEL[item.priority]}</span>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Warum?</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-silver">{item.reason}</p>
            </div>
            <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Empfohlener nächster Schritt</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-silver">{item.recommendation}</p>
            </div>

            {messages[item.key] && <p role="status" className="mt-3 text-[11.5px] font-semibold text-emerald-200">{messages[item.key]}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={item.href} className="inline-flex h-10 items-center gap-2 rounded-xl bg-electric px-4 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Vorgang prüfen <ArrowRight className="h-3.5 w-3.5" /></Link>
              {canCreateTasks && item.canCreateTask && (
                <button type="button" disabled={busyKey !== ""} onClick={() => void adopt(item)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-[11.5px] font-bold text-white hover:bg-white/[0.08] disabled:opacity-50">
                  {busyKey === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPlus className="h-3.5 w-3.5" />}
                  Als Aufgabe übernehmen
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
