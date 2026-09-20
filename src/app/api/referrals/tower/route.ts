import { NextResponse } from "next/server";
import { getReferralTower } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tower = await getReferralTower();
    return NextResponse.json(
      { ok: true, tower },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Der Monatsturm ist gerade nicht verfügbar." }, { status: 503 });
  }
}
