import { createHash, createHmac } from "node:crypto";
import { pool } from "@/db";

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
const REFERRAL_LIMIT = 5;
const REFERRAL_WINDOW_MS = 60 * 60 * 1000;

function localReferralRateLimited(key: string) {
  const now = Date.now();
  for (const [bucketKey, value] of registrations) if (value.until <= now) registrations.delete(bucketKey);
  if (registrations.size >= 10000 && !registrations.has(key)) return true;
  const current = registrations.get(key);
  if (!current) {
    registrations.set(key, { count: 1, until: now + REFERRAL_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > REFERRAL_LIMIT;
}

export async function referralRateLimit(networkKey: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return { limited: localReferralRateLimited(networkKey), retryAfter: 3600 };
  }
  const keyHash = createHmac("sha256", secret).update("referral-register:v1:" + networkKey).digest("hex");
  try {
    const result = await pool.query<{ request_count: number; reset_at: Date }>(
      `
        WITH cleanup AS (
          DELETE FROM public_intake_rate_limits
          WHERE updated_at < now() - interval '24 hours'
        ),
        updated AS (
          INSERT INTO public_intake_rate_limits (key_hash, window_started_at, request_count, updated_at)
          VALUES ($1, now(), 1, now())
          ON CONFLICT (key_hash) DO UPDATE SET
            request_count = CASE
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '1 hour' THEN 1
              ELSE public_intake_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '1 hour' THEN now()
              ELSE public_intake_rate_limits.window_started_at
            END,
            updated_at = now()
          RETURNING request_count, window_started_at
        )
        SELECT request_count, window_started_at + interval '1 hour' AS reset_at
        FROM updated
      `,
      [keyHash],
    );
    const row = result.rows[0];
    if (!row) return { limited: localReferralRateLimited(keyHash), retryAfter: 3600 };
    return {
      limited: row.request_count > REFERRAL_LIMIT,
      retryAfter: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
    };
  } catch {
    console.error("[referrals] shared rate limit unavailable");
    return { limited: localReferralRateLimited(keyHash), retryAfter: 3600 };
  }
}
