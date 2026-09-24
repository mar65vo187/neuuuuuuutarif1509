import { createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { employees, type Employee } from "@/db/schema";
import { portalSessions } from "@/db/enterprise-schema";

const COOKIE_NAME = "tw_session";

// Legacy signed-token helpers remain for backwards-compatible test coverage only.
// Live portal sessions use opaque random tokens stored server-side below.
const LEGACY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_ABSOLUTE_SECONDS = 60 * 60 * 12;
const SESSION_IDLE_SECONDS = 60 * 60;
const SESSION_TOUCH_SECONDS = 5 * 60;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 random characters");
  }
  return secret;
}

export function hashPassword(password: string): string {
  if (!password || password.length > 200) throw new Error("Invalid password length");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || password.length > 200) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [scheme, salt, hash] = parts;
  if (scheme !== "scrypt" || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(hash)) return false;
  try {
    const candidate = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
    });
    return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

type SessionPayload = { uid: number; exp: number; credential: string };

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function credentialSignature(passwordHash: string): string {
  return sign(`credential:${passwordHash}`);
}

function sessionTokenHash(token: string): string {
  return createHmac("sha256", getSecret()).update(`portal-session:v2:${token}`).digest("hex");
}

function privacyHash(value: string, purpose: string): string {
  return createHmac("sha256", getSecret()).update(`${purpose}:${value}`).digest("hex");
}

export function createSessionToken(userId: number, passwordHash: string): string {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !passwordHash) throw new Error("Invalid session user");
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + LEGACY_SESSION_TTL_SECONDS,
    credential: credentialSignature(passwordHash),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token || token.length > 1024) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
    const expected = Buffer.from(sign(body));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!Number.isSafeInteger(payload.uid) || payload.uid <= 0 || !Number.isSafeInteger(payload.exp)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || payload.exp > now + LEGACY_SESSION_TTL_SECONDS) return null;
    if (typeof payload.credential !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(payload.credential)) return null;
    return payload;
  } catch {
    return null;
  }
}

function validOpaqueSessionToken(token: string | undefined): token is string {
  return Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));
}

export type SessionCreationContext = {
  mfaVerified?: boolean;
  ip?: string | null;
  userAgent?: string | null;
};

export async function setSessionCookie(
  userId: number,
  secure: boolean,
  passwordHash: string,
  context: SessionCreationContext = {},
) {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !passwordHash) throw new Error("Invalid session user");
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_SECONDS * 1000);

  await db.insert(portalSessions).values({
    employeeId: userId,
    tokenHash: sessionTokenHash(token),
    credentialSignature: credentialSignature(passwordHash),
    mfaVerified: Boolean(context.mfaVerified),
    userAgent: context.userAgent?.slice(0, 300) ?? null,
    ipHash: context.ip ? privacyHash(context.ip.slice(0, 100), "portal-session-ip") : null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
  });

  // Opportunistic cleanup; failure must not invalidate the just-created session.
  await db.delete(portalSessions).where(or(
    lt(portalSessions.expiresAt, now),
    lt(portalSessions.revokedAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
  )).catch(() => undefined);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_ABSOLUTE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (validOpaqueSessionToken(token)) {
    await db.update(portalSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(portalSessions.tokenHash, sessionTokenHash(token)), isNull(portalSessions.revokedAt)))
      .catch(() => undefined);
  }
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export type SessionUser = Pick<Employee, "id" | "name" | "email" | "role" | "advisorId"> & {
  sessionId?: number;
  mfaVerified?: boolean;
};

export function isPortalOwner(user: Pick<SessionUser, "email" | "role">): boolean {
  const ownerEmail = (process.env.PORTAL_OWNER_EMAIL || process.env.PORTAL_ADMIN_EMAIL || "").trim().toLowerCase();
  return user.role === "admin" && ownerEmail.length > 0 && user.email.trim().toLowerCase() === ownerEmail;
}

export type ActivePortalSession = {
  id: number;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  mfaVerified: boolean;
  userAgent: string | null;
  current: boolean;
};

export class AuthenticationUnavailableError extends Error {
  constructor() { super("Die Anmeldung kann momentan nicht überprüft werden."); }
}

async function currentOpaqueToken() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return validOpaqueSessionToken(token) ? token : null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await currentOpaqueToken();
  if (!token) return null;
  const tokenHash = sessionTokenHash(token);
  try {
    const [row] = await db
      .select({
        sessionId: portalSessions.id,
        sessionCredential: portalSessions.credentialSignature,
        mfaVerified: portalSessions.mfaVerified,
        createdAt: portalSessions.createdAt,
        lastSeenAt: portalSessions.lastSeenAt,
        expiresAt: portalSessions.expiresAt,
        revokedAt: portalSessions.revokedAt,
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        advisorId: employees.advisorId,
        active: employees.active,
        passwordHash: employees.passwordHash,
      })
      .from(portalSessions)
      .innerJoin(employees, eq(portalSessions.employeeId, employees.id))
      .where(eq(portalSessions.tokenHash, tokenHash))
      .limit(1);

    if (!row || !row.active || row.revokedAt) return null;
    const now = Date.now();
    if (row.expiresAt.getTime() <= now) {
      await db.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.id, row.sessionId)).catch(() => undefined);
      return null;
    }
    if (row.lastSeenAt.getTime() + SESSION_IDLE_SECONDS * 1000 <= now) {
      await db.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.id, row.sessionId)).catch(() => undefined);
      return null;
    }

    const expectedCredential = Buffer.from(credentialSignature(row.passwordHash));
    const actualCredential = Buffer.from(row.sessionCredential);
    if (expectedCredential.length !== actualCredential.length || !timingSafeEqual(actualCredential, expectedCredential)) {
      await db.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.id, row.sessionId)).catch(() => undefined);
      return null;
    }

    if (row.lastSeenAt.getTime() + SESSION_TOUCH_SECONDS * 1000 <= now) {
      await db.update(portalSessions).set({ lastSeenAt: new Date(now) }).where(eq(portalSessions.id, row.sessionId)).catch(() => undefined);
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      advisorId: row.advisorId,
      sessionId: row.sessionId,
      mfaVerified: row.mfaVerified,
    };
  } catch {
    throw new AuthenticationUnavailableError();
  }
}

export async function listActivePortalSessions(user: SessionUser): Promise<ActivePortalSession[]> {
  const currentId = user.sessionId ?? -1;
  const now = new Date();
  const rows = await db.select({
    id: portalSessions.id,
    createdAt: portalSessions.createdAt,
    lastSeenAt: portalSessions.lastSeenAt,
    expiresAt: portalSessions.expiresAt,
    mfaVerified: portalSessions.mfaVerified,
    userAgent: portalSessions.userAgent,
  }).from(portalSessions)
    .where(and(
      eq(portalSessions.employeeId, user.id),
      isNull(portalSessions.revokedAt),
    ));

  return rows
    .filter((row) => row.expiresAt.getTime() > now.getTime() && row.lastSeenAt.getTime() + SESSION_IDLE_SECONDS * 1000 > now.getTime())
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .map((row) => ({ ...row, current: row.id === currentId }));
}

export async function revokeOtherPortalSessions(user: SessionUser) {
  if (!user.sessionId) return 0;
  const rows = await db.update(portalSessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(portalSessions.employeeId, user.id),
      ne(portalSessions.id, user.sessionId),
      isNull(portalSessions.revokedAt),
    ))
    .returning({ id: portalSessions.id });
  return rows.length;
}

export async function revokeAllPortalSessions(userId: number) {
  const rows = await db.update(portalSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(portalSessions.employeeId, userId), isNull(portalSessions.revokedAt)))
    .returning({ id: portalSessions.id });
  return rows.length;
}

export async function markCurrentSessionMfaVerified(verified: boolean) {
  const token = await currentOpaqueToken();
  if (!token) return false;
  const rows = await db.update(portalSessions)
    .set({ mfaVerified: verified, lastSeenAt: new Date() })
    .where(and(eq(portalSessions.tokenHash, sessionTokenHash(token)), isNull(portalSessions.revokedAt)))
    .returning({ id: portalSessions.id });
  return rows.length === 1;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Reject cross-origin cookie-authenticated mutations, including login CSRF. */
export function isSameOriginRequest(request: { headers: Headers; url: string }): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const target = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host") ?? target.host;
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? `${forwardedProtocol}:` : target.protocol;
  const trustedOrigin = new URL(`${protocol}//${host}`).origin;

  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";

  try {
    const source = new URL(origin);
    if (source.origin !== origin || !["https:", "http:"].includes(source.protocol)) return false;
    return source.origin === target.origin || source.origin === trustedOrigin;
  } catch {
    return false;
  }
}
