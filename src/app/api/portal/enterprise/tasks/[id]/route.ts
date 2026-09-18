import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { updateTask } from "@/lib/enterprise";
import { requirePermission } from "@/lib/enterprise-access";
import { taskUpdateSchema } from "@/lib/enterprise-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    await requirePermission(user, "task.manage");
    const raw = (await context.params).id;
    const id = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Ungültige ID." }, { status: 400 });
    const parsed = taskUpdateSchema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const task = await updateTask(id, {
      ...parsed.data,
      dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt === null ? null : new Date(parsed.data.dueAt),
    }, user);
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aufgabe konnte nicht aktualisiert werden." }, { status });
  }
}
