import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { PortalShell } from "@/components/portal/PortalShell";
import { getCurrentUser } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { getUnreadNotificationCount } from "@/lib/portal-productivity";
import { permissionKeys } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const PORTAL_PAGE_TITLES: ReadonlyArray<readonly [string, string]> = [
  ["/portal/auftraege/neu", "Auftrag anlegen"],
  ["/portal/auftraege", "Aufträge"],
  ["/portal/kunden/neu", "Kundenprofil anlegen"],
  ["/portal/kunden", "Kunden"],
  ["/portal/optimierung", "Optimierungsservice"],
  ["/portal/leads/neu", "Lead anlegen"],
  ["/portal/leads/pipeline", "Lead-Pipeline"],
  ["/portal/leads", "Leads & Termine"],
  ["/portal/service/neu", "Servicefall anlegen"],
  ["/portal/service", "Service & Fälle"],
  ["/portal/assistent", "KI & Arbeitsassistent"],
  ["/portal/aufgaben", "Aufgaben & Wiedervorlagen"],
  ["/portal/empfehlungen", "Empfehlungen"],
  ["/portal/finanzen", "Provisionsübersicht"],
  ["/portal/inbox", "Action Inbox"],
  ["/portal/kampagnen", "Kampagnen"],
  ["/portal/chat", "Nachrichten"],
  ["/portal/betrieb", "Team & Betriebsqualität"],
  ["/portal/rennen", "Team-Challenges"],
  ["/portal/verguetung", "Vergütung & Karriere"],
  ["/portal/reporting", "Auswertungen"],
  ["/portal/produkte", "Produkte & Partner"],
  ["/portal/verwaltung", "Mitarbeiter verwalten"],
  ["/portal/einstellungen", "Mein Zugang"],
  ["/portal/sicherheit", "Sicherheit"],
  ["/portal/audit", "Audit & Compliance"],
  ["/portal/system", "Automationen & Integrationen"],
  ["/portal", "Übersicht & Fokus"],
];

export async function generateMetadata() {
  const pathname = (await headers()).get("x-tarifwerk-portal-path")?.split("?")[0] ?? "/portal";
  const match = PORTAL_PAGE_TITLES.find(([route]) => pathname === route);
  const detail = pathname.match(/^\/portal\/(kunden|leads|auftraege|service)\/[^/]+$/);
  const detailTitles = { kunden: "Kundenakte", leads: "Lead-Akte", auftraege: "Auftragsdetails", service: "Servicefall" };
  const title = match?.[1] ?? (detail ? detailTitles[detail[1] as keyof typeof detailTitles] : "Arbeitsbereich");
  return { title: title + " · TarifWerk CRM", robots: { index: false, follow: false } };
}

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const requested = (await headers()).get("x-tarifwerk-portal-path") ?? "/portal";
    redirect(`/portal/login?next=${encodeURIComponent(requested)}`);
  }

  const effectivePermissions = [...await permissionKeys(user)];
  let openCount = 0;
  let notificationCount = 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.status, "neu"), leadAccessCondition(user)));
    openCount = row?.count ?? 0;
  } catch {
    openCount = 0;
  }

  try {
    notificationCount = await getUnreadNotificationCount(user);
  } catch {
    notificationCount = 0;
  }

  return (
    <PortalShell user={user} permissions={effectivePermissions} openCount={openCount} notificationCount={notificationCount}>
      {children}
    </PortalShell>
  );
}
