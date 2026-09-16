import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, isSameOriginRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht erlaubt." }, { status: 403 });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
