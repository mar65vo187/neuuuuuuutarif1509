import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { employees } from "./schema";
import { orders } from "./enterprise-schema";
import { referrers, referrals } from "./referral-schema";

export const referralRewards = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
  referrerId: integer("referrer_id").notNull().references(() => referrers.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  ruleKey: text("rule_key").notNull(),
  status: text("status").notNull().default("completed"),
  maxVoucherAmountCents: integer("max_voucher_amount_cents").notNull(),
  voucherAmountCents: integer("voucher_amount_cents"),
  cashAmountCents: integer("cash_amount_cents"),
  payoutChoice: text("payout_choice"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("referral_rewards_referral_unique").on(table.referralId),
  index("referral_rewards_referrer_idx").on(table.referrerId, table.status),
  index("referral_rewards_order_idx").on(table.orderId),
]);

export const referralRewardEvents = pgTable("referral_reward_events", {
  id: serial("id").primaryKey(),
  rewardId: integer("reward_id").notNull().references(() => referralRewards.id, { onDelete: "cascade" }),
  actorEmployeeId: integer("actor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  status: text("status"),
  voucherAmountCents: integer("voucher_amount_cents"),
  cashAmountCents: integer("cash_amount_cents"),
  note: text("note"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("referral_reward_events_reward_idx").on(table.rewardId, table.createdAt)]);

export type ReferralReward = typeof referralRewards.$inferSelect;
