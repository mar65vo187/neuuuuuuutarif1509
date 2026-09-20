import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { gameMonthDate, getEmployeeRace, getReferralTower } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const month = request.nextUrl.searchParams.get("month");
    const periodDate = gameMonthDate(month);
    const [race, tower] = await Promise.all([getEmployeeRace(periodDate), getReferralTower(periodDate)]);
    return NextResponse.json(
      { ok: true, currentUserId: user.id, race, tower },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Spielstände konnten nicht geladen werden." }, { status: 503 });
  }
}
