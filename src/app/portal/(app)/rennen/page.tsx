import { redirect } from "next/navigation";
import { PerformanceGameDashboard } from "@/components/portal/PerformanceGameDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeRace, getReferralTower } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function TeamChallengesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Frennen");

  const [race, tower] = await Promise.all([getEmployeeRace(), getReferralTower()]);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-electric-deep">Team-Challenges</p>
        <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Monats-Rennstrecke & Empfehlungsturm</h1>
        <p className="mt-2 max-w-4xl text-[13.5px] leading-relaxed text-steel">Live-Motivation aus echten CRM-Daten. Qualifizierte Arbeit und aktivierte Abschlüsse bewegen die Anzeige automatisch; es gibt keine manuellen Punkte und keine negativen Punkte.</p>
      </header>
      <PerformanceGameDashboard initial={{ currentUserId: user.id, race, tower }} />
    </div>
  );
}
