import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runOperationsSweep } from "@/lib/operations-sweep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const value = request.headers.get("authorization") ?? "";
  const expected = "Bearer " + secret;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  try {
    const result = await runOperationsSweep();
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[operations-sweep] failed");
    return NextResponse.json({ ok: false, error: "Operations-Wächter fehlgeschlagen." }, { status: 500 });
  }
}