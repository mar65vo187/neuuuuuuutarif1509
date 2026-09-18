import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { loginEvents, mfaCredentials } from "@/db/enterprise-schema";
import { isSameOriginRequest, setSessionCookie, verifyPassword } from "@/lib/auth";
import { decryptMfaSecret, verifyTotp } from "@/lib/mfa";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; reset: number }>();
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
let lastCleanup = 0;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function logLogin(data: { employeeId?: number | null; email: string; success: boolean; reason: string; ip: string; userAgent: string | null }) {
  try {
    await db.insert(loginEvents).values({
      employeeId: data.employeeId ?? null,
      emailHash: digest(data.email),
      success: data.success,
      reason: data.reason,
      ipHash: digest(data.ip),
      userAgent: data.userAgent?.slice(0, 300) ?? null,
    });
  } catch {
    // Login remains available if enterprise audit tables are not initialized yet.
  }
}

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
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bitte E-Mail, Passwort und gegebenenfalls 2FA-Code prüfen." }, { status: 422 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || "unknown";
  const userAgent = req.headers.get("user-agent");
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
      await logLogin({ employeeId: user?.id, email: parsed.data.email, success: false, reason: "invalid_credentials", ip, userAgent });
      return NextResponse.json({ ok: false, error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    let mfa: { secretEncrypted: string; enabled: boolean } | undefined;
    try {
      [mfa] = await db.select({ secretEncrypted: mfaCredentials.secretEncrypted, enabled: mfaCredentials.enabled })
        .from(mfaCredentials).where(eq(mfaCredentials.employeeId, user.id)).limit(1);
    } catch {
      mfa = undefined;
    }

    if (mfa?.enabled) {
      if (!parsed.data.mfaCode) {
        return NextResponse.json({ ok: false, mfaRequired: true, error: "Bitte den 6-stelligen Authenticator-Code eingeben." }, { status: 202, headers: { "Cache-Control": "no-store" } });
      }
      const validMfa = verifyTotp(decryptMfaSecret(mfa.secretEncrypted), parsed.data.mfaCode);
      if (!validMfa) {
        await logLogin({ employeeId: user.id, email: parsed.data.email, success: false, reason: "invalid_mfa", ip, userAgent });
        return NextResponse.json({ ok: false, mfaRequired: true, error: "Der 2FA-Code ist nicht korrekt." }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      await db.update(mfaCredentials).set({ lastUsedAt: new Date() }).where(eq(mfaCredentials.employeeId, user.id)).catch(() => undefined);
    }

    const forwardedProtocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const secure = forwardedProtocol ? forwardedProtocol === "https" : req.nextUrl.protocol === "https:";
    await setSessionCookie(user.id, secure, user.passwordHash);
    attempts.delete(`account:${parsed.data.email}`);
    if (reservedIpAttempt && attempts.get(keys[0]) === reservedIpAttempt) {
      reservedIpAttempt.count = Math.max(0, reservedIpAttempt.count - 1);
    }
    await logLogin({ employeeId: user.id, email: parsed.data.email, success: true, reason: mfa?.enabled ? "password_mfa" : "password", ip, userAgent });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    for (const key of keys) {
      const attempt = attempts.get(key);
      if (attempt) attempt.count = Math.max(0, attempt.count - 1);
    }
    console.error("[login] Authentication service is unavailable; verify database and session configuration.");
    return NextResponse.json({ ok: false, error: "Anmeldung derzeit nicht möglich. Bitte später erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
