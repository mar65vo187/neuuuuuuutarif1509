import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { employeeCompensationProfiles, loyaltyBonusLedger } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { DEFAULT_LOYALTY_YEARS, isCompensationOwner } from "@/lib/compensation";
import { appendFinancialLedger } from "@/lib/finance-ledger";
import { writeAudit } from "@/lib/enterprise";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  type: z.enum(["credit", "payout", "correction_debit"]),
  amount: z.number().positive().max(1_000_000),
  note: z.string().trim().min(3, "Bitte einen nachvollziehbaren Grund angeben.").max(500),
}).strict();

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht zulässig." }, { status: 403 });
  }

  const owner = await getCurrentUser().catch(() => null);
  if (!owner) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  if (!isCompensationOwner(owner)) {
    return NextResponse.json({ ok: false, error: "Nur der hinterlegte Owner-Account darf Treueguthaben verändern." }, { status: 403 });
  }

  const rawId = (await context.params).id;
  const employeeId = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ ok: false, error: "Ungültige Mitarbeiter-ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 4096);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(746174, ${employeeId})`);

      const [employee] = await tx.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee) throw Object.assign(new Error("Mitarbeiter nicht gefunden."), { status: 404 });

      const [profile] = await tx.select().from(employeeCompensationProfiles).where(eq(employeeCompensationProfiles.employeeId, employeeId)).limit(1);
      const loyaltyStartedAt = profile?.loyaltyStartedAt ?? new Date();
      const loyaltyVestingYears = profile?.loyaltyVestingYears ?? DEFAULT_LOYALTY_YEARS;
      const eligibleAt = addYears(loyaltyStartedAt, loyaltyVestingYears);

      const [totals] = await tx.select({
        credits: sql<string>`coalesce(sum(case when ${loyaltyBonusLedger.type} = 'credit' then ${loyaltyBonusLedger.amount} else 0 end), 0)::text`,
        debits: sql<string>`coalesce(sum(case when ${loyaltyBonusLedger.type} in ('payout','correction_debit') then ${loyaltyBonusLedger.amount} else 0 end), 0)::text`,
      }).from(loyaltyBonusLedger).where(eq(loyaltyBonusLedger.employeeId, employeeId));

      const balance = Math.max(0, Number(totals?.credits ?? 0) - Number(totals?.debits ?? 0));
      if (parsed.data.type === "payout") {
        if (Date.now() < eligibleAt.getTime()) {
          throw Object.assign(new Error(`Auszahlungen sind erst ab ${eligibleAt.toLocaleDateString("de-DE")} möglich.`), { status: 422 });
        }
        if (parsed.data.amount > balance) {
          throw Object.assign(new Error("Die Auszahlung darf das vorhandene Treueguthaben nicht überschreiten."), { status: 422 });
        }
      }
      if (parsed.data.type === "correction_debit" && parsed.data.amount > balance) {
        throw Object.assign(new Error("Die Korrektur darf das vorhandene Treueguthaben nicht überschreiten."), { status: 422 });
      }

      const [entry] = await tx.insert(loyaltyBonusLedger).values({
        employeeId,
        type: parsed.data.type,
        amount: String(parsed.data.amount),
        note: parsed.data.note,
        createdByEmployeeId: owner.id,
      }).returning();

      await appendFinancialLedger(tx, {
        sourceKey: "loyalty:" + entry.id,
        eventType: "loyalty_" + parsed.data.type,
        scope: "employee",
        entityType: "loyalty_bonus",
        entityId: entry.id,
        employeeId,
        actorEmployeeId: owner.id,
        amount: parsed.data.amount,
        effect: parsed.data.type === "credit" ? "increase" : "decrease",
        reference: "employee:" + employeeId,
        metadata: { note: parsed.data.note },
        occurredAt: entry.createdAt,
      });
      await writeAudit(tx, owner.id, "loyalty.entry_created", "loyalty_bonus", entry.id, undefined, {
        employeeId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        resultingBalance: parsed.data.type === "credit" ? balance + parsed.data.amount : balance - parsed.data.amount,
      });

      const newBalance = parsed.data.type === "credit"
        ? balance + parsed.data.amount
        : balance - parsed.data.amount;

      return { employee, entry, balance: newBalance, eligibleAt };
    });

    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 503;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Treueguthaben konnte nicht geändert werden." }, { status });
  }
}
