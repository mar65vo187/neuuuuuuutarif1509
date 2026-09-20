import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { referrers } from "@/db/referral-schema";
import { isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { referralRateLimit, referralTokenHash } from "@/lib/referrals";
import { REFERRAL_AVATAR_KEYS } from "@/lib/gamification-rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(6).max(40),
  displayName: z.string().trim().min(2).max(40),
  avatarKey: z.enum(REFERRAL_AVATAR_KEYS),
  leaderboardOptIn: z.boolean().default(false),
  consent: z.literal(true),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const networkKey = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
  ).slice(0, 100);
  const limit = await referralRateLimit(networkKey);
  if (limit.limited) {
    return NextResponse.json(
      { ok: false, error: "Bitte versuche es später erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  try {
    const input = schema.safeParse(await readJsonBody(request, 4096));
    if (!input.success) return NextResponse.json({ ok: false, error: "Bitte Name, E-Mail, Telefonnummer, Wunschname, Avatar und Zustimmung vollständig angeben." }, { status: 422 });
    const code = randomBytes(12).toString("hex");
    const token = randomBytes(32).toString("hex");
    await db.insert(referrers).values({
      name: input.data.name,
      email: input.data.email,
      phone: input.data.phone,
      displayName: input.data.displayName,
      avatarKey: input.data.avatarKey,
      leaderboardOptIn: input.data.leaderboardOptIn,
      code,
      tokenHash: referralTokenHash(token),
    });
    return NextResponse.json({ ok: true, shareUrl: `/freund-werben?ref=${code}`, dashboardUrl: `/freund-werben/status#${token}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Der Link konnte gerade nicht erstellt werden. Bitte erneut versuchen." }, { status: error instanceof RequestBodyError ? error.status : 503 });
  }
}
