"use client";

import { useRouter } from "next/navigation";
import {
  BellRing, CheckCircle2, Clock3, Flame, Loader2, Mail, MessageSquareText,
  MousePointerClick, Send, Target, UsersRound, Zap,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/portal/ui";

type ActivityEmployee = {
  id: number;
  name: string;
  email: string;
  role: string;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  lastActionAt: string | null;
  activeDays7: number;
  leads7: number;
  calls7: number;
  customerActivities7: number;
  tasksCompleted7: number;
  orders7: number;
  orders30: number;
  unreadNotifications: number;
  nudges30: number;
  unacknowledgedNudges: number;
  lastNudgeAt: string | null;
  lastNudgeAckAt: string | null;
  activityIndex: number;
  activityBand: "active" | "steady" | "low" | "inactive";
};

type Props = {
  employees: ActivityEmployee[];
  stats: {
    teamMembers: number;
    activeToday: number;
    needsAttention: number;
    openNudges: number;
    actions7: number;
  };
  currentAdminId: number;
};

const bandLabel = {
  active: "Sehr aktiv",
  steady: "Solide aktiv",
  low: "Wenig Aktivität",
  inactive: "Keine aktuelle Aktivität",
} as const;

const bandClass = {
  active: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  steady: "border-blue-300/30 bg-blue-400/10 text-blue-200",
  low: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  inactive: "border-red-300/30 bg-red-400/10 text-red-200",
} as const;

const QUICK_NUDGES = [
  "Kurzer Denkanstoß: Bitte prüfe heute deine offenen Leads und setze bei jedem einen klaren nächsten Schritt.",
  "Bitte bring heute deine Wiedervorlagen auf Stand und dokumentiere Kontakte direkt im CRM.",
  "Fokus für heute: Kunden aktiv nachfassen, offene Termine sauber terminieren und Abschlüsse vollständig dokumentieren.",
];

function when(value: string | null) {
  if (!value) return "noch keine Aktivität";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "gerade eben";
  if (diff < 3_600_000) return "vor " + Math.max(1, Math.floor(diff / 60_000)) + " Min.";
  if (diff < 86_400_000) return "vor " + Math.max(1, Math.floor(diff / 3_600_000)) + " Std.";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function EmployeeActivityDashboard({ employees, stats, currentAdminId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("team");

  const visible = useMemo(() => employees
    .filter((employee) => filter === "all" || (filter === "team" ? employee.role !== "admin" : employee.activityBand === filter))
    .sort((a, b) => {
      const weight = { inactive: 0, low: 1, steady: 2, active: 3 };
      const diff = weight[a.activityBand] - weight[b.activityBand];
      return diff || a.activityIndex - b.activityIndex || a.name.localeCompare(b.name);
    }), [employees, filter]);

  async function sendMessage(employee: ActivityEmployee, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy !== null) return;
    setBusy(employee.id);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const kind = String(form.get("kind") ?? "nudge");
    try {
      const response = await fetch("/api/portal/admin/employee-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          kind,
          subject: String(form.get("subject") ?? ""),
          body: String(form.get("body") ?? ""),
          priority: String(form.get("priority") ?? "normal"),
          requiresAck: form.get("requiresAck") === "on",
          actionUrl: String(form.get("actionUrl") ?? ""),
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; recipientName?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Nachricht konnte nicht gesendet werden.");
      setMessage("Nachricht an " + (result.recipientName || employee.name) + " gesendet.");
      event.currentTarget.reset();
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Nachricht konnte nicht gesendet werden.");
    } finally {
      setBusy(null);
    }
  }

  const cards = [
    { label: "Aktive Teammitglieder", value: stats.teamMembers, icon: UsersRound },
    { label: "Heute aktiv", value: stats.activeToday, icon: Flame },
    { label: "Aufmerksamkeit sinnvoll", value: stats.needsAttention, icon: Target },
    { label: "Offene Anstupser", value: stats.openNudges, icon: BellRing },
    { label: "Dokumentierte Aktionen · 7 Tage", value: stats.actions7, icon: Zap },
  ];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-electric-soft">Admin Aktivitätsmonitor</p>
        <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight text-white">Wie aktiv arbeitet das Team im CRM?</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-silver">Der Aktivitätsindex bündelt dokumentierte CRM-Arbeit der letzten sieben Tage. Er ist ein Arbeitssignal und kein Qualitäts- oder Leistungsurteil. Die Einzelwerte bleiben sichtbar, damit nichts in einer Blackbox verschwindet.</p>
      </div>
    </header>

    {message && <div role="status" className="rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-slate-100">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => <Card key={label} className="p-4 sm:p-4">
        <Icon className="h-4 w-4 text-electric-soft" />
        <p className="mt-3 text-2xl font-extrabold">{value}</p>
        <p className="mt-1 text-[11px] leading-4 text-silver">{label}</p>
      </Card>)}
    </section>

    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["team", "Mitarbeiter"],
          ["low", "Wenig aktiv"],
          ["inactive", "Inaktiv"],
          ["steady", "Solide"],
          ["active", "Sehr aktiv"],
          ["all", "Alle inkl. Admins"],
        ].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={"rounded-xl border px-3 py-2 text-xs font-bold " + (filter === value ? "border-electric bg-electric text-white" : "border-white/10 bg-white/[0.04] text-silver hover:text-white")}>{label}</button>)}
      </div>
    </Card>

    <section className="space-y-4">
      {visible.map((employee) => {
        const self = employee.id === currentAdminId;
        return <details key={employee.id} className="group rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,27,49,.96),rgba(8,18,34,.94))] text-slate-100 shadow-xl">
          <summary className="cursor-pointer list-none p-5">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold">{employee.name}</h2>
                  <span className={"rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + bandClass[employee.activityBand]}>{bandLabel[employee.activityBand]}</span>
                  {employee.role === "admin" && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-silver">Admin</span>}
                  {employee.unacknowledgedNudges > 0 && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">{employee.unacknowledgedNudges} Anstupser offen</span>}
                </div>
                <p className="mt-1 text-xs text-silver">{employee.email} · letzte CRM-Aktion {when(employee.lastActionAt)} · Portal zuletzt {when(employee.lastSeenAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-silver">Aktivitätsindex</p><p className="text-2xl font-extrabold">{employee.activityIndex}<span className="text-xs text-silver">/100</span></p></div>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-electric" style={{ width: employee.activityIndex + "%" }} /></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                ["Aktive Tage", employee.activeDays7],
                ["Leads", employee.leads7],
                ["Calls", employee.calls7],
                ["Kundenaktionen", employee.customerActivities7],
                ["Aufgaben", employee.tasksCompleted7],
                ["Aufträge", employee.orders7],
              ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-center"><p className="text-lg font-extrabold">{value}</p><p className="text-[9.5px] text-silver">{label} · 7T</p></div>)}
            </div>
          </summary>

          <div className="border-t border-white/8 p-5">
            <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-electric-soft">Weitere Signale</p>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><dt className="text-silver">Aufträge · 30 Tage</dt><dd className="font-bold">{employee.orders30}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-silver">Ungelesene Inbox</dt><dd className="font-bold">{employee.unreadNotifications}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-silver">Anstupser · 30 Tage</dt><dd className="font-bold">{employee.nudges30}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-silver">Letzter Anstupser</dt><dd className="font-bold">{when(employee.lastNudgeAt)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-silver">Letzte Bestätigung</dt><dd className="font-bold">{when(employee.lastNudgeAckAt)}</dd></div>
                  </dl>
                </div>
                <p className="text-[11px] leading-5 text-slate-400">Index: Aktualität der letzten CRM-Aktion, aktive Arbeitstage, Leads, dokumentierte Kontakte, erledigte Aufgaben und Aufträge. Alle Komponenten sind oben einzeln sichtbar.</p>
              </div>

              {!self && <form onSubmit={(event) => sendMessage(employee, event)} className="rounded-2xl border border-electric/15 bg-electric/[0.04] p-4">
                <div className="flex items-center gap-3"><MessageSquareText className="h-5 w-5 text-electric-soft" /><div><p className="font-extrabold">Persönlich an {employee.name}</p><p className="text-[11px] text-silver">Direkt in dessen Action Inbox. Anstupser verlangen automatisch eine Bestätigung.</p></div></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-silver">Art<select name="kind" defaultValue="nudge" className="field mt-1.5 min-h-10 bg-slate-950 text-white"><option value="nudge">Anstupser / Denkanstoß</option><option value="personal_message">Persönliche Nachricht</option></select></label>
                  <label className="text-xs font-bold text-silver">Priorität<select name="priority" defaultValue={employee.activityBand === "inactive" ? "high" : "normal"} className="field mt-1.5 min-h-10 bg-slate-950 text-white"><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></label>
                  <label className="text-xs font-bold text-silver sm:col-span-2">Betreff<input name="subject" required defaultValue="Kurzer Denkanstoß" maxLength={180} className="field mt-1.5 min-h-10 bg-white text-ink" /></label>
                  <label className="text-xs font-bold text-silver sm:col-span-2">Nachricht<textarea name="body" required rows={4} maxLength={4000} defaultValue={QUICK_NUDGES[employee.id % QUICK_NUDGES.length]} className="field mt-1.5 bg-white text-ink" /></label>
                  <label className="text-xs font-bold text-silver">Interner Link <span className="font-normal">(optional)</span><input name="actionUrl" defaultValue="/portal/leads" className="field mt-1.5 min-h-10 bg-white text-ink" /></label>
                  <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 px-3 py-3 text-xs"><input name="requiresAck" type="checkbox" defaultChecked /> Gelesen-Bestätigung verlangen</label>
                </div>
                <button disabled={busy !== null} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-electric px-4 text-xs font-extrabold text-white disabled:opacity-50">{busy === employee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} In Inbox senden</button>
              </form>}
            </div>
          </div>
        </details>;
      })}
      {visible.length === 0 && <Card><p className="text-center text-sm text-silver">Für diesen Filter gibt es aktuell keine Mitarbeiter.</p></Card>}
    </section>

    <Card className="border-champagne/20">
      <div className="flex items-start gap-3"><MousePointerClick className="mt-0.5 h-5 w-5 text-champagne-soft" /><div><p className="font-extrabold">So ist das System gedacht</p><p className="mt-1 text-xs leading-5 text-silver">Admins sehen nachvollziehbare Aktivitätssignale. Ein Anstupser landet sichtbar im persönlichen Posteingang und bleibt als offen markiert, bis der Mitarbeiter ihn bestätigt. Dadurch wird aus „ich habe es gesagt“ ein dokumentierter Kommunikationsprozess.</p></div></div>
    </Card>
  </div>;
}
