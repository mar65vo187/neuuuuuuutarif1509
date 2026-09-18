import { NextResponse, type NextRequest } from "next/server";
import { processOutbox } from "@/lib/outbox-worker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await processOutbox(50);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[outbox] worker failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
