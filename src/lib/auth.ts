import { createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, type Employee } from "@/db/schema";

const COOKIE_NAME = "tw_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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

export function createSessionToken(userId: number, passwordHash: string): string {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !passwordHash) throw new Error("Invalid session user");
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
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
    if (payload.exp <= now || payload.exp > now + SESSION_TTL_SECONDS) return null;
    if (typeof payload.credential !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(payload.credential)) return null;
    return payload;
  } catch {
    // Malformed/expired cookies and missing configuration must never crash a page.
    return null;
  }
}

/** Reject cross-origin cookie-authenticated mutations, including login CSRF. */
export function isSameOriginRequest(request: { headers: Headers; url: string }): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const source = new URL(origin);
    if (source.origin !== origin || !["https:", "http:"].includes(source.protocol)) return false;
    const target = new URL(request.url);
    if (source.origin === target.origin) return true;
    // Reverse proxies may expose an internal request URL; Host remains the browser's target.
    const host = request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
      ? `${forwardedProtocol}:` : target.protocol;
    return Boolean(host && source.origin === new URL(`${protocol}//${host}`).origin);
  } catch {
    return false;
  }
}

export async function setSessionCookie(userId: number, secure: boolean, passwordHash: string) {
  const token = createSessionToken(userId, passwordHash);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export type SessionUser = Pick<Employee, "id" | "name" | "email" | "role" | "advisorId">;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const payload = readSessionToken(store.get(COOKIE_NAME)?.value);
  if (!payload) return null;
  try {
    const [user] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        advisorId: employees.advisorId,
        active: employees.active,
        passwordHash: employees.passwordHash,
      })
      .from(employees)
      .where(eq(employees.id, payload.uid))
      .limit(1);
    if (!user || !user.active) return null;
    const expected = Buffer.from(credentialSignature(user.passwordHash));
    const actual = Buffer.from(payload.credential);
    if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, advisorId: user.advisorId };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
