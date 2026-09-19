import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { productUpdateReads, productUpdates } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht zulässig." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  const raw = (await context.params).id;
  if (!/^\d+$/.test(raw)) return NextResponse.json({ ok: false, error: "Ungültige Update-ID." }, { status: 400 });
  const updateId = Number(raw);
  const [update] = await db.select({ id: productUpdates.id }).from(productUpdates).where(eq(productUpdates.id, updateId)).limit(1);
  if (!update) return NextResponse.json({ ok: false, error: "Update nicht gefunden." }, { status: 404 });

  await db.insert(productUpdateReads).values({ updateId, employeeId: user.id })
    .onConflictDoUpdate({
      target: [productUpdateReads.updateId, productUpdateReads.employeeId],
      set: { readAt: new Date() },
    });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
