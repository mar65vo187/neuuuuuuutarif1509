import { createHash, createHmac } from "node:crypto";

export const REFERRAL_CODE = /^[a-f0-9]{24}$/;
export const REFERRAL_TOKEN = /^[a-f0-9]{64}$/;
export const referralTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function referralCustomerHash(email: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is required");
  return createHmac("sha256", secret).update(`referral:${email.trim().toLowerCase()}`).digest("hex");
}
export function referralBenefits() {
  return {
    friend: process.env.REFERRAL_FRIEND_BENEFIT?.trim().slice(0, 500) || null,
    referrer: process.env.REFERRAL_REFERRER_BENEFIT?.trim().slice(0, 500) || null,
  };
}

const registrations = new Map<string, { count: number; until: number }>();
/** Best effort per process; deployment must overwrite forwarded headers at its trusted proxy. */
export function referralRateLimited(ip: string) {
  const now = Date.now();
  for (const [key, value] of registrations) if (value.until <= now) registrations.delete(key);
  if (registrations.size >= 10000 && !registrations.has(ip)) return true;
  const current = registrations.get(ip);
  if (!current) { registrations.set(ip, { count: 1, until: now + 3600000 }); return false; }
  return ++current.count > 5;
}
