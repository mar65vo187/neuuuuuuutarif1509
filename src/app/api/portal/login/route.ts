import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { employees } from "@/db/schema";
import { loginEvents, mfaCredentials } from "@/db/enterprise-schema";
import { isSameOriginRequest, setSessionCookie, verifyPassword } from "@/lib/auth";
import { decryptMfaSecret, verifyTotp } from "@/lib/mfa";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 10;
const attempts = new Map<string, { count: number; reset: number }>();
const DUMMY_HASH = `scrypt${"0".repeat(32)}${"0".repeat(128)}`;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET fehlt oder ist zu kurz.");
  return value;
}

function digest(value: string, purpose: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("hex");
}

function localLimit(key: string) {
  const now = Date.now();
  for (const [bucketKey, value] of attempts) if (value.reset <= now) attempts.delete(bucketKey);
  const attempt = attempts.get(key);
  if (!attempt || attempt.reset <= now) {
    attempts.set(key, { count: 1, reset: now + WINDOW_MS });
    return { limited: false, retryAfter: Math.ceil(WINDOW_MS / 1000) };
  }
  attempt.count += 1;
  return { limited: attempt.count > LIMIT, retryAfter: Math.max(1, Math.ceil((attempt.reset - now) / 1000)) };
}

async function consumeLoginLimit(rawKey: string) {
  const keyHash = digest(rawKey, "portal-login-limit");
  try {
    const result = await pool.query<{ request_count: number; reset_at: Date }>(
      `
        WITH cleanup AS (
          DELETE FROM portal_login_rate_limits
          WHERE updated_at < now() - interval '24 hours'
        ),
        updated AS (
          INSERT INTO portal_login_rate_limits (key_hash, window_started_at, request_count, updated_at)
          VALUES ($1, now(), 1, now())
          ON CONFLICT (key_hash) DO UPDATE SET
            request_count = CASE
              WHEN portal_login_rate_limits.window_started_at <= now() - interval '15 minutes' THEN 1
              ELSE portal_login_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN portal_login_rate_limits.window_started_at <= now() - interval '15 minutes' THEN now()
              ELSE portal_login_rate_limits.window_started_at
            END,
            updated_at = now()
          RETURNING request_count, window_started_at
        )
        SELECT request_count, window_started_at + interval '15 minutes' AS reset_at
        FROM updated
      `,
      [keyHash],
    );
    const row = result.rows[0];
    if (!row) return localLimit(keyHash);
    return {
      limited: row.request_count > LIMIT,
      retryAfter: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
      keyHash,
    };
  } catch {
    return { ...localLimit(keyHash), keyHash };
  }
}

async function clearLoginLimit(rawKey: string) {
  const keyHash = digest(rawKey, "portal-login-limit");
  await pool.query("DELETE FROM portal_login_rate_limits WHERE key_hash = $1", [keyHash]).catch(() => undefined);
  attempts.delete(keyHash);
}

async function logLogin(data: { employeeId?: number | null; email: string; success: boolean; reason: string; ip: string; userAgent: string | null }) {
  try {
    await db.insert(loginEvents).values({
      employeeId: data.employeeId ?? null,
      emailHash: digest(data.email, "login-email"),
      success: data.success,
      reason: data.reason,
      ipHash: digest(data.ip, "login-ip"),
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

  const ip = (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown"
  ).slice(0, 100);
  const userAgent = req.headers.get("user-agent");
  let ipLimit: { limited: boolean; retryAfter: number };
  let accountLimit: { limited: boolean; retryAfter: number };
  try {
    [ipLimit, accountLimit] = await Promise.all([
      consumeLoginLimit("ip:" + ip),
      consumeLoginLimit("account:" + parsed.data.email),
    ]);
  } catch {
    return NextResponse.json({ ok: false, error: "Anmeldung derzeit nicht möglich. Bitte später erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (ipLimit.limited || accountLimit.limited) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(Math.max(ipLimit.retryAfter, accountLimit.retryAfter)), "Cache-Control": "no-store" } },
    );
  }
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
    await setSessionCookie(user.id, secure, user.passwordHash, {
      mfaVerified: Boolean(mfa?.enabled),
      ip,
      userAgent,
    });
    await clearLoginLimit("account:" + parsed.data.email);
    await logLogin({ employeeId: user.id, email: parsed.data.email, success: true, reason: mfa?.enabled ? "password_mfa" : "password", ip, userAgent });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[login] Authentication service is unavailable; verify database and session configuration.");
    return NextResponse.json({ ok: false, error: "Anmeldung derzeit nicht möglich. Bitte später erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
