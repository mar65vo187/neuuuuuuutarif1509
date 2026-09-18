import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { loginEvents, mfaCredentials } from "@/db/enterprise-schema";
import { Card, formatDate } from "@/components/portal/ui";
import { MfaPanel } from "@/components/portal/MfaPanel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fsicherheit");
  const [[mfa], events] = await Promise.all([
    db.select({ enabled: mfaCredentials.enabled }).from(mfaCredentials).where(eq(mfaCredentials.employeeId, user.id)).limit(1).catch(() => []),
    db.select().from(loginEvents).where(eq(loginEvents.employeeId, user.id)).orderBy(desc(loginEvents.createdAt)).limit(20).catch(() => []),
  ]);
  return <div className="space-y-6">
    <header><p className="eyebrow text-electric-deep">Account</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Sicherheit</h1><p className="text-[14px] text-steel">Zwei-Faktor-Anmeldung und letzte Anmeldeereignisse.</p></header>
    <Card><MfaPanel initiallyEnabled={mfa?.enabled ?? false} /></Card>
    <Card><h2 className="text-[16px] font-extrabold">Letzte Anmeldungen</h2>{events.length === 0 ? <p className="mt-4 text-[14px] text-steel">Noch keine protokollierten Anmeldungen.</p> :
      <ul className="mt-3 divide-y divide-line">{events.map((event) => <li key={event.id} className="flex items-center justify-between gap-3 py-3 text-[13.5px]"><div><p className="font-semibold">{event.success ? "Erfolgreich" : "Fehlgeschlagen"}</p><p className="text-[12px] text-steel">{event.reason || "Anmeldung"}</p></div><p className="text-[12px] text-steel">{formatDate(event.createdAt)}</p></li>)}</ul>}
    </Card>
  </div>;
}
