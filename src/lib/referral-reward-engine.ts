import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { orders, products, providers } from "@/db/enterprise-schema";
import { referrers, referrals } from "@/db/referral-schema";
import { referralRewardEvents, referralRewards } from "@/db/referral-reward-schema";
import { REFERRAL_REWARD_RULES, resolveReferralRewardRule } from "@/lib/referral-rewards";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function syncReferralRewardForOrder(
  tx: Tx,
  orderId: number,
  orderStatus: string,
  actorEmployeeId: number | null,
) {
  const [row] = await tx.select({
    referralId: referrals.id,
    referrerId: referrals.referrerId,
    leadTopic: leads.topic,
    productName: products.name,
    productCategory: products.category,
    providerName: providers.name,
  }).from(orders)
    .leftJoin(referrals, eq(referrals.leadId, orders.leadId))
    .leftJoin(leads, eq(leads.id, orders.leadId))
    .leftJoin(products, eq(products.id, orders.productId))
    .leftJoin(providers, eq(providers.id, orders.providerId))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row?.referralId || !row.referrerId) return null;

  const [existing] = await tx.select().from(referralRewards)
    .where(eq(referralRewards.referralId, row.referralId))
    .limit(1);

  if (orderStatus === "cancelled" || orderStatus === "storno") {
    if (!existing) return null;
    const nextStatus = existing.status === "paid" ? "chargeback" : "cancelled";
    if (existing.status === nextStatus) return existing;
    const [updated] = await tx.update(referralRewards).set({
      status: nextStatus,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(referralRewards.id, existing.id)).returning();
    await tx.insert(referralRewardEvents).values({
      rewardId: existing.id,
      actorEmployeeId,
      eventType: nextStatus,
      status: nextStatus,
      voucherAmountCents: existing.voucherAmountCents,
      cashAmountCents: existing.cashAmountCents,
      metadata: { orderId },
    });
    return updated;
  }

  if (orderStatus !== "active") return existing ?? null;
  if (existing) return existing;

  const rule = resolveReferralRewardRule(row.productName, row.productCategory, row.providerName, row.leadTopic);
  if (!rule) return null;

  const [created] = await tx.insert(referralRewards).values({
    referralId: row.referralId,
    referrerId: row.referrerId,
    orderId,
    ruleKey: rule.key,
    status: "completed",
    maxVoucherAmountCents: rule.maxVoucherAmount * 100,
  }).onConflictDoNothing({ target: referralRewards.referralId }).returning();

  if (!created) {
    const [current] = await tx.select().from(referralRewards)
      .where(eq(referralRewards.referralId, row.referralId)).limit(1);
    return current ?? null;
  }

  await tx.insert(referralRewardEvents).values({
    rewardId: created.id,
    actorEmployeeId,
    eventType: "completed",
    status: "completed",
    metadata: { orderId, ruleKey: rule.key, maxVoucherAmount: rule.maxVoucherAmount },
  });
  return created;
}

export async function getReferralRewardOverview(referrerId: number) {
  const rewards = await db.select().from(referralRewards)
    .where(eq(referralRewards.referrerId, referrerId))
    .orderBy(desc(referralRewards.createdAt));

  const summary = rewards.reduce((acc, reward) => {
    acc.potentialVoucherCents += reward.status === "cancelled" || reward.status === "chargeback" ? 0 : reward.maxVoucherAmountCents;
    if (reward.status === "approved") {
      acc.approvedVoucherCents += reward.voucherAmountCents ?? 0;
      acc.approvedCashCents += reward.cashAmountCents ?? 0;
    }
    if (reward.status === "paid") {
      acc.paidVoucherCents += reward.voucherAmountCents ?? 0;
      acc.paidCashCents += reward.cashAmountCents ?? 0;
    }
    return acc;
  }, {
    potentialVoucherCents: 0,
    approvedVoucherCents: 0,
    approvedCashCents: 0,
    paidVoucherCents: 0,
    paidCashCents: 0,
  });

  return {
    summary,
    rewards: rewards.map((reward) => {
      const rule = REFERRAL_REWARD_RULES.find((item) => item.key === reward.ruleKey);
      return {
        id: reward.id,
        ruleKey: reward.ruleKey,
        label: rule?.label ?? reward.ruleKey,
        status: reward.status,
        maxVoucherAmountCents: reward.maxVoucherAmountCents,
        voucherAmountCents: reward.voucherAmountCents,
        cashAmountCents: reward.cashAmountCents,
        payoutChoice: reward.payoutChoice,
        createdAt: reward.createdAt,
        approvedAt: reward.approvedAt,
        paidAt: reward.paidAt,
      };
    }),
  };
}

export async function listReferralRewardsForAdmin(limit = 200) {
  return db.select({
    reward: referralRewards,
    referralId: referrals.id,
    leadId: referrals.leadId,
    referrerName: referrers.name,
    referrerEmail: referrers.email,
  }).from(referralRewards)
    .innerJoin(referrals, eq(referralRewards.referralId, referrals.id))
    .innerJoin(referrers, eq(referralRewards.referrerId, referrers.id))
    .orderBy(desc(referralRewards.updatedAt))
    .limit(Math.max(1, Math.min(limit, 500)));
}

export async function setReferralRewardStatus(
  rewardId: number,
  input: { status: "approved" | "paid" | "cancelled"; voucherAmount?: number; payoutChoice?: "voucher" | "cash"; note?: string },
  actorEmployeeId: number,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(referralRewards)
      .where(eq(referralRewards.id, rewardId)).limit(1).for("update");
    if (!existing) throw new Error("Empfehlungsprämie nicht gefunden.");

    let voucherAmountCents = existing.voucherAmountCents;
    let cashAmountCents = existing.cashAmountCents;
    if (input.status === "approved") {
      if (input.voucherAmount === undefined || !Number.isFinite(input.voucherAmount) || input.voucherAmount < 0) {
        throw new Error("Bitte bestätigte Gutscheinprämie angeben.");
      }
      voucherAmountCents = Math.round(input.voucherAmount * 100);
      if (voucherAmountCents > existing.maxVoucherAmountCents) {
        throw new Error("Bestätigte Prämie darf den veröffentlichten Maximalwert nicht überschreiten.");
      }
      cashAmountCents = Math.floor(voucherAmountCents / 2);
    }
    if (input.status === "paid" && existing.status !== "approved") {
      throw new Error("Nur freigegebene Prämien können als ausgezahlt markiert werden.");
    }

    const now = new Date();
    const [updated] = await tx.update(referralRewards).set({
      status: input.status,
      voucherAmountCents,
      cashAmountCents,
      payoutChoice: input.payoutChoice ?? existing.payoutChoice,
      approvedAt: input.status === "approved" ? now : existing.approvedAt,
      paidAt: input.status === "paid" ? now : existing.paidAt,
      cancelledAt: input.status === "cancelled" ? now : existing.cancelledAt,
      updatedAt: now,
    }).where(eq(referralRewards.id, rewardId)).returning();

    await tx.insert(referralRewardEvents).values({
      rewardId,
      actorEmployeeId,
      eventType: input.status,
      status: input.status,
      voucherAmountCents,
      cashAmountCents,
      note: input.note?.trim() || null,
      metadata: { payoutChoice: updated.payoutChoice },
    });
    return updated;
  });
}
