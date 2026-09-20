import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/db";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { aiProviderStatus, askTarifWerkAi } from "@/lib/ai-sales-assistant";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  question: z.string().trim().min(3).max(5000),
  mode: z.enum(["coach", "objection", "message", "product", "pitch"]).default("coach"),
  audience: z.enum(["b2c", "b2b"]).default("b2c"),
}).strict();

async function usedToday(employeeId: number) {
  const result = await pool.query<{ count: number }>(`
    SELECT count(*)::int AS count
    FROM ai_assistant_usage
    WHERE employee_id = $1
      AND status = 'completed'
      AND created_at >= (
        date_trunc('day', timezone('Europe/Berlin', now())) AT TIME ZONE 'Europe/Berlin'
      )
  `, [employeeId]);
  return result.rows[0]?.count ?? 0;
}

async function recordUsage(input: {
  employeeId: number;
  provider: string;
  model: string;
  mode: string;
  inputChars: number;
  outputChars: number;
  status: "completed" | "failed" | "blocked";
}) {
  try {
    await pool.query(`
      INSERT INTO ai_assistant_usage
        (employee_id, provider, model, mode, input_chars, output_chars, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      input.employeeId,
      input.provider.slice(0, 80),
      input.model.slice(0, 160),
      input.mode.slice(0, 40),
      Math.max(0, input.inputChars),
      Math.max(0, input.outputChars),
      input.status,
    ]);
  } catch {
    console.error("[ai] usage telemetry unavailable");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 24 * 1024));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingabe prüfen." }, { status: 422 });
    }

    const provider = aiProviderStatus();
    if (!provider.gemini && !provider.openrouter) {
      return NextResponse.json({
        ok: false,
        error: "Die echte KI ist im Server noch nicht aktiviert. Es fehlt ein Gemini- oder OpenRouter-API-Key.",
        configurationRequired: true,
      }, { status: 503 });
    }

    const used = await usedToday(user.id);
    if (used >= provider.dailyLimit) {
      await recordUsage({
        employeeId: user.id,
        provider: provider.preferred,
        model: "quota",
        mode: parsed.data.mode,
        inputChars: parsed.data.question.length,
        outputChars: 0,
        status: "blocked",
      });
      return NextResponse.json({
        ok: false,
        error: "Das heutige kostenlose KI-Kontingent für diesen Zugang ist erreicht.",
        remaining: 0,
      }, { status: 429 });
    }

    try {
      const answer = await askTarifWerkAi(parsed.data);
      await recordUsage({
        employeeId: user.id,
        provider: answer.provider,
        model: answer.model,
        mode: parsed.data.mode,
        inputChars: parsed.data.question.length,
        outputChars: answer.text.length,
        status: "completed",
      });
      return NextResponse.json({
        ok: true,
        ...answer,
        remaining: Math.max(0, provider.dailyLimit - used - 1),
      }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      await recordUsage({
        employeeId: user.id,
        provider: provider.preferred,
        model: process.env.TARIFWERK_AI_GEMINI_MODEL || process.env.TARIFWERK_AI_OPENROUTER_MODEL || "unknown",
        mode: parsed.data.mode,
        inputChars: parsed.data.question.length,
        outputChars: 0,
        status: "failed",
      });
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Die KI konnte gerade nicht antworten.",
      }, { status: 503 });
    }
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Die KI-Anfrage konnte nicht verarbeitet werden." }, { status: 500 });
  }
}
