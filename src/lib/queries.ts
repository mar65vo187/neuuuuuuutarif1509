import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees, leadNotes, leads, teamMessages, type Advisor } from "@/db/schema";
import { leadCallActivities, leadProductLinks, productCatalogProfiles, products, providers } from "@/db/enterprise-schema";
import { SITE } from "@/lib/content";
import { isPortalOwner, requireUser, type SessionUser } from "@/lib/auth";
import { getLeadPageBounds, leadSearchPattern, normalizeLeadProductFilter } from "@/lib/lead-query-filters";

/* ------------------------------------------------------------------ */
/*  Advisors                                                           */
/* ------------------------------------------------------------------ */

const PUBLIC_ADVISOR_FALLBACK: Advisor[] = [
  {
    id: 0,
    slug: "marvin-egenolf",
    name: "Marvin Noel Egenolf",
    title: "Gründer von TarifWerk",
    city: "Wiesbaden",
    region: "Deutschlandweit",
    regions: ["Wiesbaden", "Mainz", "Frankfurt am Main", "Worms", "Deutschlandweit (digital)"],
    topics: ["Internet, Mobilfunk, TV", "Strom & Gas", "Versicherungen", "Sicherheitslösungen", "Klimaanlagen", "Solar (Photovoltaik) & Wärmepumpe", "Edelmetalle", "Immobilien"],
    bio: "Marvin hat TarifWerk gegründet, um mehrere Vertrags-, Versorgungs- und Entscheidungsthemen in einem persönlichen Beratungsprozess zusammenzuführen. Sein Anspruch: relevante Kriterien offen erklären, Empfehlungen nachvollziehbar begründen und danach erreichbar bleiben.",
    quote: "Ich möchte, dass Sie nach unserem Gespräch verstehen, welche Möglichkeiten Sie haben und warum ein nächster Schritt sinnvoll ist – oder eben nicht.",
    phone: "+4915782301076",
    whatsapp: "4915782301076",
    email: SITE.email,
    initials: "ME",
    imageUrl: null,
    isFounder: true,
    active: true,
    sortOrder: 1,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },
];


export async function getActiveAdvisors(): Promise<Advisor[]> {
  try {
    const rows = await db
      .select()
      .from(advisors)
      .where(eq(advisors.active, true))
      .orderBy(asc(advisors.sortOrder), asc(advisors.name));
    return rows.map((a) => a.slug === "marvin-egenolf" ? { ...a, email: SITE.email } : a);
  } catch {
    return PUBLIC_ADVISOR_FALLBACK;
  }
}

export async function getAdvisorBySlug(slug: string): Promise<Advisor | null> {
  try {
    const [a] = await db.select().from(advisors).where(and(eq(advisors.slug, slug), eq(advisors.active, true))).limit(1);
    return a ? (a.slug === "marvin-egenolf" ? { ...a, email: SITE.email } : a) : null;
  } catch {
    return PUBLIC_ADVISOR_FALLBACK.find((advisor) => advisor.slug === slug) ?? null;
  }
}

/* ------------------------------------------------------------------ */
/*  Leads (portal)                                                     */
/* ------------------------------------------------------------------ */

/** Admins see all leads; employees see leads they created or were explicitly assigned. */
export function leadAccessCondition(user: SessionUser): SQL {
  if (user.role === "admin") return sql`true`;
  return or(
    eq(leads.createdByEmployeeId, user.id),
    eq(leads.assignedEmployeeId, user.id),
  )!;
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

export type LeadFilter = {
  status?: string;
  type?: string;
  priority?: string;
  next?: string;
  productId?: number;
  productRelation?: string;
  assignedEmployeeId?: number;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  lookahead?: boolean;
};

export type LeadPage = {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Convert both local midnights separately so DST days span 23 or 25 hours. */
function leadDueTodayCondition(): SQL {
  return sql`${leads.nextActionAt} >= (date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')
    and ${leads.nextActionAt} < ((date_trunc('day', now() at time zone 'Europe/Berlin') + interval '1 day') at time zone 'Europe/Berlin')
    and ${leads.status} not in ('abgeschlossen','verloren')`;
}

function leadFilterCondition(filter: LeadFilter | undefined, user: SessionUser): SQL {
  const conditions = [leadAccessCondition(user)];
  if (filter?.status && (leads.status.enumValues as readonly string[]).includes(filter.status)) conditions.push(eq(leads.status, filter.status as typeof leads.status.enumValues[number]));
  if (filter?.type && (leads.type.enumValues as readonly string[]).includes(filter.type)) conditions.push(eq(leads.type, filter.type as typeof leads.type.enumValues[number]));
  if (filter?.assignedEmployeeId && Number.isSafeInteger(filter.assignedEmployeeId) && filter.assignedEmployeeId > 0) conditions.push(eq(leads.assignedEmployeeId, filter.assignedEmployeeId));
  if (filter?.priority === "attention") conditions.push(sql`${leads.priority} in ('high','hot') and ${leads.status} not in ('abgeschlossen','verloren')`);
  else if (filter?.priority && ["low", "normal", "high", "hot"].includes(filter.priority)) conditions.push(eq(leads.priority, filter.priority));
  if (filter?.next === "overdue") conditions.push(sql`${leads.nextActionAt} is not null and ${leads.nextActionAt} < now() and ${leads.status} not in ('abgeschlossen','verloren')`);
  if (filter?.next === "today") conditions.push(leadDueTodayCondition());
  if (filter?.next === "missing") conditions.push(sql`${leads.nextActionAt} is null and ${leads.status} not in ('termin_bestaetigt','abgeschlossen','verloren')`);
  const { productId, productRelation } = normalizeLeadProductFilter(filter?.productId, filter?.productRelation);
  if (productId) {
    conditions.push(productRelation
      ? sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.product_id = ${productId} and lpl.relation = ${productRelation})`
      : sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.product_id = ${productId})`);
  } else if (productRelation === "none") {
    conditions.push(sql`not exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id}) and ${leads.status} not in ('abgeschlossen','verloren')`);
  } else if (productRelation) {
    conditions.push(sql`exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id} and lpl.relation = ${productRelation})`);
  }
  const q = leadSearchPattern(filter?.q);
  if (q) {
    conditions.push(or(
      ilike(leads.name, q),
      ilike(leads.email, q),
      ilike(leads.phone, q),
      ilike(leads.topic, q),
      ilike(leads.region, q),
    )!);
  }
  return and(...conditions)!;
}

async function selectLeadRows(database: Pick<typeof db, "select">, condition: SQL, sort: string | undefined, limit: number, offset = 0): Promise<LeadRow[]> {
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

  const base = database
    .select(selection)
    .from(leads)
    .leftJoin(advisors, eq(leads.advisorId, advisors.id))
    .leftJoin(employees, eq(leads.assignedEmployeeId, employees.id))
    .where(condition);

  const ordering = sort === "next"
    ? [sql`${leads.nextActionAt} asc nulls last`, desc(leads.updatedAt), desc(leads.id)]
    : sort === "oldest"
      ? [asc(leads.createdAt), asc(leads.id)]
      : [desc(leads.createdAt), desc(leads.id)];
  const rows = await base.orderBy(...ordering).limit(limit).offset(offset);

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

/** Legacy array API; list screens should use listLeadsPage to reach every record. */
export async function listLeads(filter?: LeadFilter, user?: SessionUser): Promise<LeadRow[]> {
  const current = user ?? await requireUser();
  const pageSize = Number.isSafeInteger(filter?.pageSize) && filter!.pageSize! > 0 ? Math.min(filter!.pageSize!, 300) : 300;
  const page = Number.isSafeInteger(filter?.page) && filter!.page! > 0 ? Math.min(filter!.page!, 100000) : 1;
  const queryLimit = Math.min(pageSize + (filter?.lookahead ? 1 : 0), 301);
  return selectLeadRows(db, leadFilterCondition(filter, current), filter?.sort, queryLimit, (page - 1) * pageSize);
}

export async function listLeadsPage(filter?: LeadFilter, user?: SessionUser): Promise<LeadPage> {
  const current = user ?? await requireUser();
  const condition = leadFilterCondition(filter, current);
  // A shared snapshot prevents concurrent edits from disagreeing with the count.
  return db.transaction(async (tx) => {
    const [count] = await tx.select({ total: sql<number>`count(*)::int` }).from(leads).where(condition);
    const total = count?.total ?? 0;
    const { page, pageSize, totalPages, offset } = getLeadPageBounds(total, filter?.page, filter?.pageSize);
    const rows = total > 0 ? await selectLeadRows(tx, condition, filter?.sort, pageSize, offset) : [];
    return { rows, total, page, pageSize, totalPages };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
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
    noProductCount: sql<number>`count(*) filter (where not exists (select 1 from lead_product_links lpl where lpl.lead_id = ${leads.id}) and ${leads.status} not in ('abgeschlossen','verloren'))::int`,
    missingNextCount: sql<number>`count(*) filter (where ${leads.nextActionAt} is null and ${leads.status} not in ('termin_bestaetigt','abgeschlossen','verloren'))::int`,
    dueTodayCount: sql<number>`count(*) filter (where ${leadDueTodayCondition()})::int`,
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
    noProductCount: row?.noProductCount ?? 0,
    missingNextCount: row?.missingNextCount ?? 0,
    dueTodayCount: row?.dueTodayCount ?? 0,
  };
}

export async function listLeadProductOptions() {
  return db.select({
    id: products.id,
    name: products.name,
    category: products.category,
    providerName: providers.name,
    imageUrl: productCatalogProfiles.imageUrl,
  }).from(products)
    .innerJoin(providers, eq(products.providerId, providers.id))
    .leftJoin(productCatalogProfiles, eq(productCatalogProfiles.productId, products.id))
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
    imageUrl: productCatalogProfiles.imageUrl,
  }).from(leadProductLinks)
    .innerJoin(products, eq(leadProductLinks.productId, products.id))
    .innerJoin(providers, eq(products.providerId, providers.id))
    .leftJoin(productCatalogProfiles, eq(productCatalogProfiles.productId, products.id))
    .where(eq(leadProductLinks.leadId, leadId))
    .orderBy(leadProductLinks.relation, products.category, providers.name, products.name);
}

export async function getLeadCallActivities(leadId: number, user?: SessionUser) {
  if (!await getLead(leadId, user)) return [];
  return db
    .select({
      id: leadCallActivities.id,
      calledAt: leadCallActivities.calledAt,
      reachedPerson: leadCallActivities.reachedPerson,
      reaction: leadCallActivities.reaction,
      outcome: leadCallActivities.outcome,
      attemptNumber: leadCallActivities.attemptNumber,
      note: leadCallActivities.note,
      requestedCallbackAt: leadCallActivities.requestedCallbackAt,
      suggestedFollowUpAt: leadCallActivities.suggestedFollowUpAt,
      suggestionReason: leadCallActivities.suggestionReason,
      recommendedAction: leadCallActivities.recommendedAction,
      autoScheduled: leadCallActivities.autoScheduled,
      createdAt: leadCallActivities.createdAt,
      authorName: employees.name,
    })
    .from(leadCallActivities)
    .leftJoin(employees, eq(leadCallActivities.employeeId, employees.id))
    .where(eq(leadCallActivities.leadId, leadId))
    .orderBy(desc(leadCallActivities.calledAt), desc(leadCallActivities.id))
    .limit(50);
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

export type ChatChannel = "all" | "admins" | "direct";

export type ChatRecipient = {
  id: number;
  name: string;
  email: string;
  imageUrl: string | null;
  role: "admin" | "berater";
};

export async function listChatRecipients(user?: SessionUser): Promise<ChatRecipient[]> {
  const current = user ?? await requireUser();
  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      imageUrl: employees.imageUrl,
      role: employees.role,
    })
    .from(employees)
    .where(eq(employees.active, true))
    .orderBy(asc(employees.name), asc(employees.email));

  return rows.filter((row) => row.id !== current.id);
}

export async function findChatRecipient(input: { id?: number; email?: string }): Promise<ChatRecipient | null> {
  const id = Number.isSafeInteger(input.id) && Number(input.id) > 0 ? Number(input.id) : null;
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!id && !email) return null;

  const condition = id
    ? eq(employees.id, id)
    : sql`lower(${employees.email}) = ${email}`;

  const [row] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      imageUrl: employees.imageUrl,
      role: employees.role,
    })
    .from(employees)
    .where(and(eq(employees.active, true), condition))
    .limit(1);

  return row ?? null;
}

function directChatCondition(current: SessionUser, recipientEmployeeId: number | null, ownerAll: boolean): SQL {
  const direct = eq(teamMessages.channel, "direct");

  if (ownerAll && isPortalOwner(current)) {
    if (!recipientEmployeeId) return direct;
    return and(
      direct,
      or(
        eq(teamMessages.employeeId, recipientEmployeeId),
        eq(teamMessages.recipientEmployeeId, recipientEmployeeId),
      ),
    )!;
  }

  if (recipientEmployeeId) {
    return and(
      direct,
      or(
        and(
          eq(teamMessages.employeeId, current.id),
          eq(teamMessages.recipientEmployeeId, recipientEmployeeId),
        ),
        and(
          eq(teamMessages.employeeId, recipientEmployeeId),
          eq(teamMessages.recipientEmployeeId, current.id),
        ),
      ),
    )!;
  }

  return and(
    direct,
    or(
      eq(teamMessages.employeeId, current.id),
      eq(teamMessages.recipientEmployeeId, current.id),
    ),
  )!;
}

export async function listTeamMessages(
  channel: ChatChannel = "all",
  limit = 100,
  user?: SessionUser,
  recipientEmployeeId: number | null = null,
  ownerAll = false,
) {
  const current = user ?? await requireUser();
  if (channel === "admins" && current.role !== "admin") throw new Error("FORBIDDEN");
  if (ownerAll && !isPortalOwner(current)) throw new Error("FORBIDDEN");

  const condition = channel === "direct"
    ? directChatCondition(current, recipientEmployeeId, ownerAll)
    : eq(teamMessages.channel, channel);

  const rows = await db
    .select({
      id: teamMessages.id,
      body: teamMessages.body,
      channel: teamMessages.channel,
      createdAt: teamMessages.createdAt,
      employeeId: teamMessages.employeeId,
      recipientEmployeeId: teamMessages.recipientEmployeeId,
      authorName: employees.name,
      authorImageUrl: employees.imageUrl,
      authorEmail: employees.email,
      recipientName: sql<string | null>`(select recipient.name from employees recipient where recipient.id = ${teamMessages.recipientEmployeeId})`,
      recipientEmail: sql<string | null>`(select recipient.email from employees recipient where recipient.id = ${teamMessages.recipientEmployeeId})`,
      recipientImageUrl: sql<string | null>`(select recipient.image_url from employees recipient where recipient.id = ${teamMessages.recipientEmployeeId})`,
    })
    .from(teamMessages)
    .leftJoin(employees, eq(teamMessages.employeeId, employees.id))
    .where(condition)
    .orderBy(desc(teamMessages.createdAt))
    .limit(Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 100);

  return rows.reverse();
}
