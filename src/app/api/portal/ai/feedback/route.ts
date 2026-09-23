import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/db";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  usageId: z.number().int().positive(),
  helpful: z.boolean(),
  outcome: z.enum(["next_step", "more_information", "not_a_fit", "not_applied"]),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 2048));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Bitte Feedback-Auswahl prüfen." }, { status: 422 });
    const { usageId, helpful, outcome } = parsed.data;
    const result = await pool.query(`
      INSERT INTO ai_assistant_feedback (usage_id, employee_id, helpful, outcome)
      SELECT id, employee_id, $2, $3
      FROM ai_assistant_usage
      WHERE id = $1 AND employee_id = $4 AND status = 'completed'
      ON CONFLICT (usage_id) DO UPDATE
        SET helpful = EXCLUDED.helpful, outcome = EXCLUDED.outcome, created_at = now()
        WHERE ai_assistant_feedback.employee_id = EXCLUDED.employee_id
      RETURNING id
    `, [usageId, helpful, outcome, user.id]);
    if (!result.rowCount) return NextResponse.json({ ok: false, error: "Antwort nicht gefunden oder Feedback nicht zulässig." }, { status: 404 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("[ai] feedback unavailable");
    return NextResponse.json({ ok: false, error: "Feedback konnte nicht gespeichert werden." }, { status: 503 });
  }
}
