import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { marketingCampaignSpend } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { MARKETING_CAMPAIGNS } from "@/lib/marketing-campaigns";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const campaignKeys = MARKETING_CAMPAIGNS.map((campaign) => campaign.slug);
const schema = z.object({
  campaignKey: z.string().trim().min(2).max(120).refine((value) => campaignKeys.includes(value), "Unbekannte Kampagne."),
  source: z.enum(["google", "meta", "instagram", "tiktok", "youtube", "other"]),
  medium: z.string().trim().max(80).optional().default(""),
  amountCents: z.number().int().positive().max(100_000_000),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional().default(""),
}).strict();

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen Werbekosten erfassen." }, { status: 403 });

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    }
    const input = parsed.data;
    const spentAt = new Date(input.spentAt + "T12:00:00.000Z");
    if (!Number.isFinite(spentAt.getTime())) {
      return NextResponse.json({ ok: false, error: "Ungültiges Buchungsdatum." }, { status: 422 });
    }

    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(marketingCampaignSpend).values({
        campaignKey: input.campaignKey,
        source: input.source,
        medium: input.medium,
        amountCents: input.amountCents,
        spentAt,
        note: input.note,
        createdByEmployeeId: user.id,
      }).returning({ id: marketingCampaignSpend.id });

      await writeAudit(tx, user.id, "marketing.spend.created", "marketing_campaign_spend", row.id, undefined, {
        campaignKey: input.campaignKey,
        source: input.source,
        medium: input.medium,
        amountCents: input.amountCents,
        spentAt: spentAt.toISOString(),
      });
      return row;
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Werbekosten konnten nicht gespeichert werden." }, { status: 500 });
  }
}
