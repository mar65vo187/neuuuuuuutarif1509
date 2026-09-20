import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, Clock3, FileWarning, PackageSearch, ShieldCheck, Sparkles, Target, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCommandCenterData } from "@/lib/portal-command-center";
import { Card } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

type AssistantItem = {
  key: string;
  priority: "critical" | "high" | "normal";
  title: string;
  why: string;
  action: string;
  href: string;
  count: number;
  Icon: typeof Target;
};

export default async function WorkAssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fassistent");
  const data = await getCommandCenterData(user);
  const m = data.metrics;

  const items: AssistantItem[] = [
    m.overdueTasks > 0 && {
      key: "overdue-tasks",
      priority: "critical",
      title: "Überfällige Aufgaben zuerst bereinigen",
      why: "Überfällige Aufgaben sind ein direktes Risiko dafür, dass Rückrufe, Unterlagen oder interne Zusagen liegen bleiben.",
      action: "Überfällige Aufgaben öffnen",
      href: "/portal/aufgaben",
      count: m.overdueTasks,
      Icon: Clock3,
    },
    m.untouchedLeads24h > 0 && {
      key: "untouched-leads",
      priority: "critical",
      title: "Neue Leads ohne zeitnahe Bearbeitung",
      why: "Neue Anfragen verlieren mit jedem Tag an Aktualität. Diese Leads sind seit mehr als 24 Stunden noch im Status „Neu“.",
      action: "Neue Leads prüfen",
      href: "/portal/leads?status=neu&sort=oldest",
      count: m.untouchedLeads24h,
      Icon: AlertTriangle,
    },
    m.dueLeadFollowUpsToday > 0 && {
      key: "followups",
      priority: "high",
      title: "Heutige Wiedervorlagen abarbeiten",
      why: "Diese Kontakte haben bereits einen geplanten nächsten Schritt. Der Assistent priorisiert bestehende Zusagen vor neuen Zusatzaufgaben.",
      action: "Heutige Wiedervorlagen öffnen",
      href: "/portal/leads?next=today&sort=next",
      count: m.dueLeadFollowUpsToday,
      Icon: Target,
    },
    m.leadsMissingNextAction > 0 && {
      key: "missing-next",
      priority: "high",
      title: "Offenen Leads einen nächsten Schritt geben",
      why: "Ein offener Lead ohne Wiedervorlage kann leicht aus dem Arbeitsfluss verschwinden.",
      action: "Leads ohne nächsten Schritt",
      href: "/portal/leads?next=missing",
      count: m.leadsMissingNextAction,
      Icon: BrainCircuit,
    },
    m.attentionOrders > 0 && {
      key: "orders",
      priority: "high",
      title: "Aufträge mit Klärungsbedarf prüfen",
      why: "Fehlende Unterlagen oder lange unveränderte Aufträge verzögern Aktivierung und spätere Abrechnung.",
      action: "Aufträge prüfen",
      href: "/portal/auftraege",
      count: m.attentionOrders,
      Icon: FileWarning,
    },
    m.atRiskCustomers > 0 && {
      key: "risk-customers",
      priority: "high",
      title: "Kundenbeziehungen mit Risiko prüfen",
      why: "Diese Kunden sind intern als risikobehaftet markiert und sollten vor normalen Bestandschecks priorisiert werden.",
      action: "Risiko-Kunden öffnen",
      href: "/portal/kunden?focus=risk",
      count: m.atRiskCustomers,
      Icon: UsersRound,
    },
    m.leadsWithoutProduct > 0 && {
      key: "product-profile",
      priority: "normal",
      title: "Produktbild vervollständigen",
      why: "Bedarf, Bestand oder Abschluss sollten am Lead nachvollziehbar dokumentiert sein, damit Beratung und Übergabe sauber bleiben.",
      action: "Leads ohne Produktbild",
      href: "/portal/leads?relation=none",
      count: m.leadsWithoutProduct,
      Icon: PackageSearch,
    },
    m.dueCustomerReviews > 0 && {
      key: "reviews",
      priority: "normal",
      title: "Fällige Bestandschecks einplanen",
      why: "Regelmäßige Bestandschecks helfen, veränderten Bedarf früh zu erkennen, ohne unnötige Produkte zu pushen.",
      action: "Fällige Kundenreviews",
      href: "/portal/kunden?focus=review",
      count: m.dueCustomerReviews,
      Icon: CheckCircle2,
    },
  ].filter((item): item is AssistantItem => Boolean(item));

  const weight = { critical: 0, high: 1, normal: 2 } as const;
  items.sort((a, b) => weight[a.priority] - weight[b.priority] || b.count - a.count);

  const top = items.slice(0, 6);
  const clean = items.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Schritt 4 · Assistenz & Automation</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Arbeitsassistent</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-steel">Erklärbare Priorisierung aus echten CRM-Daten. Der Assistent empfiehlt den nächsten sinnvollen Arbeitsblock, führt zur passenden Akte und ändert keine wichtigen Daten ohne menschliche Aktion.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-[11px] font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" /> Human approval aktiv</span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Assistentenstatus">
        <Card className="sm:p-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-steel">Empfehlungen</p>
          <p className="mt-2 text-[28px] font-extrabold">{items.length}</p>
          <p className="mt-1 text-[11.5px] text-steel">aus aktuellem Arbeitsbestand</p>
        </Card>
        <Card className="sm:p-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-steel">Kritisch</p>
          <p className="mt-2 text-[28px] font-extrabold">{items.filter((item) => item.priority === "critical").length}</p>
          <p className="mt-1 text-[11.5px] text-steel">zuerst prüfen</p>
        </Card>
        <Card className="sm:p-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-steel">Automatische Änderungen</p>
          <p className="mt-2 text-[28px] font-extrabold">0</p>
          <p className="mt-1 text-[11.5px] text-steel">bei Kunden, Aufträgen oder Provisionen</p>
        </Card>
      </section>

      {clean ? (
        <Card>
          <div className="py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span>
            <h2 className="mt-4 text-[18px] font-extrabold">Keine akute Nacharbeit erkannt.</h2>
            <p className="mx-auto mt-2 max-w-lg text-[12.5px] leading-relaxed text-steel">Die aktuell überwachten Qualitäts- und Arbeitsindikatoren enthalten keine offenen Punkte. Neue Arbeit erscheint automatisch, sobald sich die zugrunde liegenden CRM-Daten ändern.</p>
          </div>
        </Card>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2" aria-label="Empfohlene nächste Schritte">
          {top.map(({ key, priority, title, why, action, href, count, Icon }, index) => {
            const tone = priority === "critical"
              ? "border-red-400/20 bg-red-400/[0.07]"
              : priority === "high"
                ? "border-amber-300/20 bg-amber-300/[0.06]"
                : "border-electric/20 bg-electric/[0.055]";
            return (
              <article key={key} className={"rounded-[22px] border p-5 " + tone}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><Icon className="h-4.5 w-4.5" /></span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-steel">Empfehlung {String(index + 1).padStart(2, "0")} · {priority === "critical" ? "kritisch" : priority === "high" ? "hoch" : "normal"}</p>
                      <h2 className="mt-1 text-[16px] font-extrabold">{title}</h2>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-extrabold">{count}</span>
                </div>
                <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">Warum?</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-silver">{why}</p>
                </div>
                <Link href={href} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep">{action}<ArrowRight className="h-4 w-4" /></Link>
              </article>
            );
          })}
        </section>
      )}

      {data.focus.length > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4.5 w-4.5 text-electric-soft" />
            <div>
              <h2 className="text-[15px] font-extrabold">Konkrete Fälle aus deinem Fokus</h2>
              <p className="mt-1 text-[11.5px] text-steel">Die ersten Fälle stammen aus dem bestehenden Command-Center und bleiben vollständig nachvollziehbar.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {data.focus.slice(0, 8).map((item) => (
              <Link key={item.key} href={item.href} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3.5 py-3 transition hover:bg-white/[0.06]">
                <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + (item.priority === "critical" ? "bg-red-400" : item.priority === "high" ? "bg-amber-300" : "bg-electric-soft")} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-extrabold">{item.title}</span><span className="block truncate text-[11px] text-steel">{item.subtitle}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-steel" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
