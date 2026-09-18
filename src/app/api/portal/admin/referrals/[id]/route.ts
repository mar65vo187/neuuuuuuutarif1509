import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authorizeAdmin, adminFailure, readAdminJson } from "@/lib/admin-server";
import { setReferralRewardStatus } from "@/lib/referral-reward-engine";

const schema = z.object({
  status: z.enum(["approved", "paid", "cancelled"]),
  voucherAmount: z.number().finite().min(0).max(100000).optional(),
  payoutChoice: z.enum(["voucher", "cash"]).optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const raw = (await context.params).id;
    const id = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ ok: false, error: "Ungültige Prämien-ID." }, { status: 400 });
    }

    const parsed = schema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    }

    const reward = await setReferralRewardStatus(id, parsed.data, admin.id);
    return NextResponse.json({ ok: true, reward });
  } catch (error) {
    return adminFailure(error);
  }
}
