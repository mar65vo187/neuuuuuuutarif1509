import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { isSameOriginRequest, setSessionCookie, verifyPassword } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; reset: number }>();
// A nonexistent account still incurs password derivation, preventing a timing shortcut.
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
let lastCleanup = 0;

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht erlaubt." }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "Ungültiges Anfrageformat." }, { status: 415 });
  }
  if (Number(req.headers.get("content-length")) > 8192) {
    return NextResponse.json({ ok: false, error: "Die Anfrage ist zu groß." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(req, 8192);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bitte E-Mail und Passwort prüfen." }, { status: 422 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || "unknown";
  const now = Date.now();
  if (now - lastCleanup > 60000 || attempts.size > 10000) {
    for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key);
    while (attempts.size > 10000) {
      const oldest = attempts.keys().next().value;
      if (!oldest) break;
      attempts.delete(oldest);
    }
    lastCleanup = now;
  }
  const keys = [`ip:${ip}`, `account:${parsed.data.email}`];
  for (const key of keys) {
    const attempt = attempts.get(key);
    if (attempt && attempt.reset > now && attempt.count >= 10) {
      return NextResponse.json(
        { ok: false, error: "Zu viele Versuche. Bitte in 15 Minuten erneut probieren." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.reset - now) / 1000)), "Cache-Control": "no-store" } },
      );
    }
  }
  // Reserve a try before the asynchronous lookup so concurrent requests cannot skip the limit.
  for (const key of keys) {
    const attempt = attempts.get(key);
    if (!attempt || attempt.reset <= now) attempts.set(key, { count: 1, reset: now + WINDOW_MS });
    else attempt.count += 1;
  }

  const reservedIpAttempt = attempts.get(keys[0]);
  try {
    const [user] = await db.select().from(employees).where(eq(sql`lower(${employees.email})`, parsed.data.email)).limit(1);
    const validPassword = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.active || !validPassword) {
      return NextResponse.json({ ok: false, error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const forwardedProtocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const secure = forwardedProtocol ? forwardedProtocol === "https" : req.nextUrl.protocol === "https:";
    await setSessionCookie(user.id, secure, user.passwordHash);
    attempts.delete(`account:${parsed.data.email}`);
    // Successful sign-ins must not lock out colleagues sharing the same IP.
    // Retain preceding failed attempts and do not touch a newer rate-limit window.
    if (reservedIpAttempt && attempts.get(keys[0]) === reservedIpAttempt) {
      reservedIpAttempt.count = Math.max(0, reservedIpAttempt.count - 1);
    }
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Configuration/database failures are retryable and must not consume the user's quota.
    for (const key of keys) {
      const attempt = attempts.get(key);
      if (attempt) attempt.count = Math.max(0, attempt.count - 1);
    }
    console.error("[login] Authentication service is unavailable; verify database and session configuration.");
    return NextResponse.json({ ok: false, error: "Anmeldung derzeit nicht möglich. Bitte später erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
