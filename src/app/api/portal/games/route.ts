import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeRace, getReferralTower } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const [race, tower] = await Promise.all([getEmployeeRace(), getReferralTower()]);
    return NextResponse.json(
      { ok: true, currentUserId: user.id, race, tower },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Spielstände konnten nicht geladen werden." }, { status: 503 });
  }
}
