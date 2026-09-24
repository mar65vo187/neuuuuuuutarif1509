import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { askPublicTarifWerkAi } from "@/lib/public-ai-assistant";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2200),
  }).strict()).min(1).max(10),
  audience: z.enum(["b2c", "b2b"]).default("b2c"),
  pagePath: z.string().trim().max(300).default("/"),
}).strict();

const LIMIT = 30;
const WINDOW_MINUTES = 15;
const GROQ_DAILY_LIMIT = Math.max(1, Math.min(950, Number(process.env.TARIFWERK_PUBLIC_AI_GROQ_DAILY_LIMIT ?? 900) || 900));
const buckets = new Map<string, { count: number; reset: number }>();
let localGroqBudget = { count: 0, reset: Date.now() + 24 * 60 * 60 * 1000 };

function localRateLimit(key: string) {
  const now = Date.now();
  for (const [bucketKey, bucket] of buckets) if (bucket.reset <= now) buckets.delete(bucketKey);
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    const reset = now + WINDOW_MINUTES * 60 * 1000;
    buckets.set(key, { count: 1, reset });
    return { limited: false, retryAfter: WINDOW_MINUTES * 60 };
  }
  current.count += 1;
  return { limited: current.count > LIMIT, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1000)) };
}

async function sharedRateLimit(networkKey: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return localRateLimit(networkKey);
  const keyHash = createHmac("sha256", secret).update("public-ai:v1:" + networkKey).digest("hex");
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
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '15 minutes' THEN 1
              ELSE public_intake_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '15 minutes' THEN now()
              ELSE public_intake_rate_limits.window_started_at
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
    if (!row) return localRateLimit(keyHash);
    return {
      limited: row.request_count > LIMIT,
      retryAfter: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
    };
  } catch {
    console.error("[public-ai] shared rate limit unavailable");
    return localRateLimit(keyHash);
  }
}


function localGroqDailyBudget() {
  const now = Date.now();
  if (localGroqBudget.reset <= now) localGroqBudget = { count: 0, reset: now + 24 * 60 * 60 * 1000 };
  localGroqBudget.count += 1;
  return { allowed: localGroqBudget.count <= GROQ_DAILY_LIMIT, remaining: Math.max(0, GROQ_DAILY_LIMIT - localGroqBudget.count) };
}

async function sharedGroqDailyBudget() {
  if (!process.env.GROQ_API_KEY?.trim()) return { allowed: false, remaining: 0 };
  const preferred = (process.env.TARIFWERK_PUBLIC_AI_PROVIDER?.trim() || "auto").toLowerCase();
  if (preferred === "xkiro") return { allowed: false, remaining: 0 };

  const secret = process.env.SESSION_SECRET;
  if (!secret) return localGroqDailyBudget();
  const keyHash = createHmac("sha256", secret).update("public-ai:groq-daily:v1").digest("hex");
  try {
    const result = await pool.query<{ request_count: number }>(
      `
        INSERT INTO public_intake_rate_limits (key_hash, window_started_at, request_count, updated_at)
        VALUES ($1, now(), 1, now())
        ON CONFLICT (key_hash) DO UPDATE SET
          request_count = CASE
            WHEN public_intake_rate_limits.window_started_at <= now() - interval '24 hours' THEN 1
            ELSE public_intake_rate_limits.request_count + 1
          END,
          window_started_at = CASE
            WHEN public_intake_rate_limits.window_started_at <= now() - interval '24 hours' THEN now()
            ELSE public_intake_rate_limits.window_started_at
          END,
          updated_at = now()
        RETURNING request_count
      `,
      [keyHash],
    );
    const count = result.rows[0]?.request_count ?? GROQ_DAILY_LIMIT + 1;
    return { allowed: count <= GROQ_DAILY_LIMIT, remaining: Math.max(0, GROQ_DAILY_LIMIT - count) };
  } catch {
    console.error("[public-ai] shared Groq daily budget unavailable");
    return localGroqDailyBudget();
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }

  const networkKey = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
  ).slice(0, 100);
  const limit = await sharedRateLimit(networkKey);
  if (limit.limited) {
    return NextResponse.json(
      { ok: false, error: "Zu viele KI-Anfragen in kurzer Zeit. Bitte versuche es später erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Bitte prüfe deine Nachricht." }, { status: 422 });
    }

    const groqBudget = await sharedGroqDailyBudget();
    const answer = await askPublicTarifWerkAi({ ...parsed.data, allowGroq: groqBudget.allowed });
    return NextResponse.json(
      { ok: true, ...answer },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Der KI-Berater ist gerade nicht verfügbar." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
