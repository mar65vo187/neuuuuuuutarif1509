import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees, leadNotes, leads, teamMessages, type Advisor } from "@/db/schema";
import { leadProductLinks, products, providers } from "@/db/enterprise-schema";
import { SITE } from "@/lib/content";
import { requireUser, type SessionUser } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Advisors                                                           */
/* ------------------------------------------------------------------ */

export async function getActiveAdvisors(): Promise<Advisor[]> {
  try {
    const rows = await db
      .select()
      .from(advisors)
      .where(eq(advisors.active, true))
      .orderBy(asc(advisors.sortOrder), asc(advisors.name));
    return rows.map((a) => a.slug === "marvin-egenolf" ? { ...a, email: SITE.email } : a);
  } catch {
    throw new Error("Beraterdaten momentan nicht erreichbar.");
  }
}

export async function getAdvisorBySlug(slug: string): Promise<Advisor | null> {
  try {
    const [a] = await db.select().from(advisors).where(and(eq(advisors.slug, slug), eq(advisors.active, true))).limit(1);
    return a ? (a.slug === "marvin-egenolf" ? { ...a, email: SITE.email } : a) : null;
  } catch {
    throw new Error("Beraterprofil momentan nicht erreichbar.");
  }
}

/* ------------------------------------------------------------------ */
/*  Leads (portal)                                                     */
/* ------------------------------------------------------------------ */

/** Admins see all leads; employees only see leads they created themselves. */
export function leadAccessCondition(user: SessionUser): SQL {
  if (user.role === "admin") return sql`true`;
  return eq(leads.createdByEmployeeId, user.id);
}

export type LeadRow = typeof leads.$inferSelect & {
  advisorName: string | null;
  assignedName: string | null;
  createdByName: string | null;
  existingProductNames: string[];
  interestProductNames: string[];
  soldProductNames: string[];
  nextActionOverdue: boolean;
};

export async function listLeads(filter?: {
  status?: string;
  type?: string;
  priority?: string;
  next?: string;
  productId?: number;
  productRelation?: string;
  q?: string;
  sort?: string;
}, user?: SessionUser) {
  const conditions = [leadAccessCondition(user ?? await requireUser())];
  if (filter?.status && (leads.status.enumValues as readonly string[]).includes(filter.status)) conditions.push(eq(leads.status, filter.status as typeof leads.status.enumValues[number]));
  if (filter?.type && (leads.type.enumValues as readonly string[]).includes(filter.type)) conditions.push(eq(leads.type, filter.type as typeof leads.type.enumValues[number]));
  if (filter?.priority && ["low", "normal", "high", "hot"].includes(filter.priority)) conditions.push(eq(leads.priority, filter.priority));
  if (filter?.next === "overdue") conditions.push(sql`${leads.nextActionAt} is not null and ${leads.nextActionAt} < now() and ${leads.status} not in ('abgeschlossen','verloren')`);
  if (filter?.next === "today") conditions.push(sql`${leads.nextActionAt} >= date_trunc('day', now()) and ${leads.nextActionAt} < date_trunc('day', now()) + interval '1 day' and ${leads.status} not in ('abgeschlossen','verloren')`);
  const productRelation = filter?.productRelation && ["interest", "existing", "sold"].includes(filter.productRelation)
    ? filter.productRelation
    : undefined;
  if (filter?.productId && Number.isSafeInteger(filter.productId) && filter.productId > 0) {
    conditions.push(productRelation
      ? sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.product_id = ${filter.productId} and lpl.relation = ${productRelation})`
      : sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.product_id = ${filter.productId})`);
  } else if (productRelation) {
    conditions.push(sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.relation = ${productRelation})`);
  }
  const q = filter?.q?.trim().slice(0, 120);
  if (q) {
    conditions.push(or(
      ilike(leads.name, `%${q}%`),
      ilike(leads.email, `%${q}%`),
      ilike(leads.phone, `%${q}%`),
      ilike(leads.topic, `%${q}%`),
      ilike(leads.region, `%${q}%`),
    )!);
  }

  const selection = {
    lead: leads,
    advisorName: advisors.name,
    assignedName: employees.name,
    createdByName: sql<string | null>`(select creator.name from employees creator where creator.id = ${leads.createdByEmployeeId})`,
    existingProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'existing'), '{}'::text[])`,
    interestProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'interest'), '{}'::text[])`,
    soldProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'sold'), '{}'::text[])`,
    nextActionOverdue: sql<boolean>`coalesce(${leads.nextActionAt} < now() and ${leads.status} not in ('abgeschlossen','verloren'), false)`,
  };

  const base = db
    .select(selection)
    .from(leads)
    .leftJoin(advisors, eq(leads.advisorId, advisors.id))
    .leftJoin(employees, eq(leads.assignedEmployeeId, employees.id))
    .where(conditions.length ? and(...conditions) : undefined);

  const rows = filter?.sort === "next"
    ? await base.orderBy(sql`case when ${leads.nextActionAt} is null then 1 else 0 end`, asc(leads.nextActionAt), desc(leads.updatedAt)).limit(300)
    : filter?.sort === "oldest"
      ? await base.orderBy(asc(leads.createdAt)).limit(300)
      : await base.orderBy(desc(leads.createdAt)).limit(300);

  return rows.map((r) => ({
    ...r.lead,
    advisorName: r.advisorName,
    assignedName: r.assignedName,
    createdByName: r.createdByName,
    existingProductNames: r.existingProductNames ?? [],
    interestProductNames: r.interestProductNames ?? [],
    soldProductNames: r.soldProductNames ?? [],
    nextActionOverdue: Boolean(r.nextActionOverdue),
  })) as LeadRow[];
}

export async function getLead(id: number, user?: SessionUser) {
  const access = leadAccessCondition(user ?? await requireUser());
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [row] = await db
    .select({
      lead: leads,
      advisorName: advisors.name,
      assignedName: employees.name,
      createdByName: sql<string | null>`(select creator.name from employees creator where creator.id = ${leads.createdByEmployeeId})`,
      existingProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'existing'), '{}'::text[])`,
      interestProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'interest'), '{}'::text[])`,
      soldProductNames: sql<string[]>`coalesce((select array_agg(p.name order by p.name) from lead_product_links lpl join products p on p.id = lpl.product_id where lpl.lead_id = ${leads.id} and lpl.relation = 'sold'), '{}'::text[])`,
      nextActionOverdue: sql<boolean>`coalesce(${leads.nextActionAt} < now() and ${leads.status} not in ('abgeschlossen','verloren'), false)`,
    })
    .from(leads)
    .leftJoin(advisors, eq(leads.advisorId, advisors.id))
    .leftJoin(employees, eq(leads.assignedEmployeeId, employees.id))
    .where(and(eq(leads.id, id), access))
    .limit(1);
  if (!row) return null;
  return {
    ...row.lead,
    advisorName: row.advisorName,
    assignedName: row.assignedName,
    createdByName: row.createdByName,
    existingProductNames: row.existingProductNames ?? [],
    interestProductNames: row.interestProductNames ?? [],
    soldProductNames: row.soldProductNames ?? [],
    nextActionOverdue: Boolean(row.nextActionOverdue),
  } as LeadRow;
}

export async function getLeadCrmOverview(user: SessionUser) {
  const access = leadAccessCondition(user);
  const [row] = await db.select({
    total: sql<number>`count(*)::int`,
    newCount: sql<number>`count(*) filter (where ${leads.status} = 'neu')::int`,
    calledCount: sql<number>`count(*) filter (where ${leads.status} = 'kontaktiert')::int`,
    appointmentCount: sql<number>`count(*) filter (where ${leads.status} = 'termin_bestaetigt')::int`,
    consultCount: sql<number>`count(*) filter (where ${leads.status} = 'in_beratung')::int`,
    wonCount: sql<number>`count(*) filter (where ${leads.status} = 'abgeschlossen')::int`,
    overdueCount: sql<number>`count(*) filter (where ${leads.nextActionAt} is not null and ${leads.nextActionAt} < now() and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
    hotCount: sql<number>`count(*) filter (where ${leads.priority} in ('high','hot') and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
    productCount: sql<number>`count(*) filter (where exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id}))::int`,
  }).from(leads).where(access);
  return {
    total: row?.total ?? 0,
    newCount: row?.newCount ?? 0,
    calledCount: row?.calledCount ?? 0,
    appointmentCount: row?.appointmentCount ?? 0,
    consultCount: row?.consultCount ?? 0,
    wonCount: row?.wonCount ?? 0,
    overdueCount: row?.overdueCount ?? 0,
    hotCount: row?.hotCount ?? 0,
    productCount: row?.productCount ?? 0,
  };
}

export async function listLeadProductOptions() {
  return db.select({
    id: products.id,
    name: products.name,
    category: products.category,
    providerName: providers.name,
  }).from(products)
    .innerJoin(providers, eq(products.providerId, providers.id))
    .where(and(eq(products.active, true), eq(providers.active, true)))
    .orderBy(products.category, providers.name, products.name)
    .limit(500);
}

export async function getLeadProductLinks(leadId: number, user?: SessionUser) {
  if (!await getLead(leadId, user)) return [];
  return db.select({
    productId: leadProductLinks.productId,
    relation: leadProductLinks.relation,
    note: leadProductLinks.note,
    createdAt: leadProductLinks.createdAt,
    productName: products.name,
    category: products.category,
    providerName: providers.name,
  }).from(leadProductLinks)
    .innerJoin(products, eq(leadProductLinks.productId, products.id))
    .innerJoin(providers, eq(products.providerId, providers.id))
    .where(eq(leadProductLinks.leadId, leadId))
    .orderBy(leadProductLinks.relation, products.category, providers.name, products.name);
}

export async function getLeadNotes(leadId: number) {
  if (!await getLead(leadId)) return [];
  return db
    .select({
      id: leadNotes.id,
      body: leadNotes.body,
      kind: leadNotes.kind,
      createdAt: leadNotes.createdAt,
      authorName: employees.name,
    })
    .from(leadNotes)
    .leftJoin(employees, eq(leadNotes.employeeId, employees.id))
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(asc(leadNotes.createdAt));
}

/* ------------------------------------------------------------------ */
/*  Dashboard-Statistiken                                              */
/* ------------------------------------------------------------------ */

export async function getDashboardStats(user?: SessionUser) {
  const access = leadAccessCondition(user ?? await requireUser());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [statusRows, typeRows, topicRows, recent, dailyRows] = await Promise.all([
    db.select({ status: leads.status, count: sql<number>`count(*)::int` }).from(leads).where(access).groupBy(leads.status),
    db.select({ type: leads.type, count: sql<number>`count(*)::int` }).from(leads).where(access).groupBy(leads.type),
    db
      .select({ topic: leads.topic, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(access)
      .groupBy(leads.topic)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        lead: leads,
        advisorName: advisors.name,
        assignedName: employees.name,
        createdByName: sql<string | null>`(select creator.name from employees creator where creator.id = ${leads.createdByEmployeeId})`,
      })
      .from(leads)
      .leftJoin(advisors, eq(leads.advisorId, advisors.id))
      .leftJoin(employees, eq(leads.assignedEmployeeId, employees.id))
      .where(access)
      .orderBy(desc(leads.createdAt))
      .limit(6),
    db
      .select({ day: sql<string>`to_char(${leads.createdAt}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(access, gte(leads.createdAt, thirtyDaysAgo)))
      .groupBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.count;
  const byType: Record<string, number> = {};
  for (const r of typeRows) byType[r.type] = r.count;

  const total = statusRows.reduce((s, r) => s + r.count, 0);
  const won = byStatus.abgeschlossen ?? 0;
  const lost = byStatus.verloren ?? 0;
  const decided = won + lost;

  // 14-Tage-Serie inkl. Nulltage
  const series: { day: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = dailyRows.find((r) => r.day === key);
    series.push({ day: key, label: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), count: found?.count ?? 0 });
  }

  return {
    total,
    open: (byStatus.neu ?? 0) + (byStatus.kontaktiert ?? 0),
    confirmed: byStatus.termin_bestaetigt ?? 0,
    inConsult: byStatus.in_beratung ?? 0,
    won,
    conversion: decided ? Math.round((won / decided) * 100) : null,
    byStatus,
    byType,
    topics: topicRows.map((r) => ({ topic: r.topic ?? "Ohne Angabe", count: r.count })),
    recent: recent.map((r) => ({
      ...r.lead,
      advisorName: r.advisorName,
      assignedName: r.assignedName,
      createdByName: r.createdByName,
      existingProductNames: [],
      interestProductNames: [],
      soldProductNames: [],
      nextActionOverdue: false,
    })) as LeadRow[],
    series,
  };
}

/* ------------------------------------------------------------------ */
/*  Team-Chat                                                          */
/* ------------------------------------------------------------------ */

export async function listTeamMessages(channel: "all" | "admins" = "all", limit = 100, user?: SessionUser) {
  const current = user ?? await requireUser();
  if (channel === "admins" && current.role !== "admin") throw new Error("FORBIDDEN");
  const rows = await db
    .select({
      id: teamMessages.id,
      body: teamMessages.body,
      channel: teamMessages.channel,
      createdAt: teamMessages.createdAt,
      employeeId: teamMessages.employeeId,
      authorName: employees.name,
      authorImageUrl: employees.imageUrl,
    })
    .from(teamMessages)
    .leftJoin(employees, eq(teamMessages.employeeId, employees.id))
    .where(eq(teamMessages.channel, channel))
    .orderBy(desc(teamMessages.createdAt))
    .limit(Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 100);
  return rows.reverse();
}
