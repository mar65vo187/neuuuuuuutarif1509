import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { leads } from "./schema";

export const referrers = pgTable("referrers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  displayName: text("display_name"),
  avatarKey: text("avatar_key").notNull().default("rocket"),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  code: text("code").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => referrers.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().unique().references(() => leads.id, { onDelete: "cascade" }),
  customerHash: text("customer_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("referrals_customer_unique").on(table.referrerId, table.customerHash)]);
