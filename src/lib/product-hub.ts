import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  benefitPoolLedger,
  commissionListVersions,
  commissionRateVersions,
  employeeCompensationProfiles,
  productCatalogProfiles,
  productUpdates,
  products,
  providerProfiles,
  providers,
} from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";

export const OWNER_POOL_PERCENT = 15;

export type MarketingChannel = {
  channel: string;
  status: "allowed" | "conditional" | "blocked";
  note?: string;
};

export async function getProductHubData(user: SessionUser, search = "") {
  const owner = isCompensationOwner(user);
  const query = search.trim();

  const productRows = await db.select({
    id: products.id,
    providerId: products.providerId,
    providerName: providers.name,
    name: products.name,
    category: products.category,
    sku: products.sku,
    active: products.active,
    expectedCommission: products.expectedCommission,
    audience: productCatalogProfiles.audience,
    lifecycleStatus: productCatalogProfiles.lifecycleStatus,
    description: productCatalogProfiles.description,
    region: productCatalogProfiles.region,
    submissionUrl: productCatalogProfiles.submissionUrl,
    supportContact: productCatalogProfiles.supportContact,
    completionProcess: productCatalogProfiles.completionProcess,
    marketingChannels: productCatalogProfiles.marketingChannels,
    marketingConditions: productCatalogProfiles.marketingConditions,
    salesArguments: productCatalogProfiles.salesArguments,
    objections: productCatalogProfiles.objections,
    checklist: productCatalogProfiles.checklist,
    requiredDocuments: productCatalogProfiles.requiredDocuments,
    trainingRequired: productCatalogProfiles.trainingRequired,
    highlight: productCatalogProfiles.highlight,
    updatedAt: productCatalogProfiles.updatedAt,
  }).from(products)
    .innerJoin(providers, eq(products.providerId, providers.id))
    .leftJoin(productCatalogProfiles, eq(productCatalogProfiles.productId, products.id))
    .where(query ? or(
      ilike(products.name, `%${query}%`),
      ilike(products.category, `%${query}%`),
      ilike(products.sku, `%${query}%`),
      ilike(providers.name, `%${query}%`),
    ) : undefined)
    .orderBy(products.category, providers.name, products.name)
    .limit(500);

  const providerRows = await db.select({
    id: providers.id,
    name: providers.name,
    category: providers.category,
    externalPartnerId: providers.externalPartnerId,
    active: providers.active,
    partnerType: providerProfiles.partnerType,
    websiteUrl: providerProfiles.websiteUrl,
    portalUrl: providerProfiles.portalUrl,
    contactName: providerProfiles.contactName,
    contactPhone: providerProfiles.contactPhone,
    contactEmail: providerProfiles.contactEmail,
    supportContact: providerProfiles.supportContact,
    billingPath: providerProfiles.billingPath,
    regions: providerProfiles.regions,
    notes: providerProfiles.notes,
    updatedAt: providerProfiles.updatedAt,
  }).from(providers)
    .leftJoin(providerProfiles, eq(providerProfiles.providerId, providers.id))
    .orderBy(providers.name)
    .limit(300);

  const rates = await db.select({
    id: commissionRateVersions.id,
    productId: commissionRateVersions.productId,
    productName: commissionRateVersions.productName,
    grossAmount: commissionRateVersions.grossAmount,
    listVersionId: commissionRateVersions.commissionListVersionId,
    createdAt: commissionRateVersions.createdAt,
  }).from(commissionRateVersions)
    .where(eq(commissionRateVersions.active, true))
    .orderBy(desc(commissionRateVersions.createdAt))
    .limit(3000);

  const latestRate = new Map<number, typeof rates[number]>();
  for (const rate of rates) {
    if (rate.productId && !latestRate.has(rate.productId)) latestRate.set(rate.productId, rate);
  }

  let payoutPercent = 82;
  if (!owner) {
    const [profile] = await db.select({ payoutPercent: employeeCompensationProfiles.payoutPercent })
      .from(employeeCompensationProfiles)
      .where(eq(employeeCompensationProfiles.employeeId, user.id))
      .limit(1);
    payoutPercent = Number(profile?.payoutPercent ?? 82);
  }

  const enrichedProducts = productRows.map((product) => {
    const rate = latestRate.get(product.id);
    const { expectedCommission, ...safeProduct } = product;
    const gross = Number(rate?.grossAmount ?? expectedCommission ?? 0);
    return {
      ...safeProduct,
      audience: product.audience ?? "both",
      lifecycleStatus: product.lifecycleStatus ?? (product.active ? "active" : "ended"),
      description: product.description ?? "",
      region: product.region ?? "Deutschland",
      completionProcess: product.completionProcess ?? "",
      marketingChannels: (product.marketingChannels ?? []) as MarketingChannel[],
      marketingConditions: product.marketingConditions ?? "",
      salesArguments: product.salesArguments ?? [],
      objections: product.objections ?? [],
      checklist: product.checklist ?? [],
      requiredDocuments: product.requiredDocuments ?? [],
      trainingRequired: product.trainingRequired ?? false,
      ownerGrossCommission: owner ? gross : null,
      ownerPoolAmount: owner ? gross * OWNER_POOL_PERCENT / 100 : null,
      employeeCommissionEstimate: owner ? null : gross * payoutPercent / 100,
      currentRateVersionId: owner ? rate?.listVersionId ?? null : null,
    };
  });

  const updates = await db.select({
    id: productUpdates.id,
    productId: productUpdates.productId,
    providerId: productUpdates.providerId,
    updateType: productUpdates.updateType,
    title: productUpdates.title,
    body: productUpdates.body,
    important: productUpdates.important,
    createdAt: productUpdates.createdAt,
  }).from(productUpdates).orderBy(desc(productUpdates.createdAt)).limit(40);

  let ownerData: null | {
    potentialPool: number;
    poolBalance: number;
    poolCredits: number;
    poolSpent: number;
    poolReserved: number;
    poolByCategory: Array<{ category: string; amount: number }>;
    commissionLists: Array<{
      id: number;
      providerId: number;
      providerName: string;
      version: number;
      sourceName: string;
      sourceType: string;
      validFrom: Date | null;
      validTo: Date | null;
      createdAt: Date;
    }>;
  } = null;

  if (owner) {
    const [ledgerRows, byCategoryRows, listRows] = await Promise.all([
      db.select({
        entryType: benefitPoolLedger.entryType,
        total: sql<string>`coalesce(sum(${benefitPoolLedger.amount}),0)::text`,
      }).from(benefitPoolLedger).groupBy(benefitPoolLedger.entryType),
      db.select({
        category: benefitPoolLedger.category,
        total: sql<string>`coalesce(sum(case
          when ${benefitPoolLedger.entryType} in ('credit','release','correction') then ${benefitPoolLedger.amount}
          else -${benefitPoolLedger.amount} end),0)::text`,
      }).from(benefitPoolLedger).groupBy(benefitPoolLedger.category).orderBy(benefitPoolLedger.category),
      db.select({
        id: commissionListVersions.id,
        providerId: commissionListVersions.providerId,
        providerName: providers.name,
        version: commissionListVersions.version,
        sourceName: commissionListVersions.sourceName,
        sourceType: commissionListVersions.sourceType,
        validFrom: commissionListVersions.validFrom,
        validTo: commissionListVersions.validTo,
        createdAt: commissionListVersions.createdAt,
      }).from(commissionListVersions)
        .innerJoin(providers, eq(commissionListVersions.providerId, providers.id))
        .orderBy(desc(commissionListVersions.createdAt))
        .limit(30),
    ]);

    const totals = new Map(ledgerRows.map((row) => [row.entryType, Number(row.total)]));
    const credits = (totals.get("credit") ?? 0) + (totals.get("release") ?? 0) + (totals.get("correction") ?? 0);
    const spent = totals.get("spend") ?? 0;
    const reserved = totals.get("reserve") ?? 0;
    ownerData = {
      potentialPool: enrichedProducts.reduce((sum, row) => sum + Number(row.ownerPoolAmount ?? 0), 0),
      poolBalance: Math.max(0, credits - spent - reserved),
      poolCredits: credits,
      poolSpent: spent,
      poolReserved: reserved,
      poolByCategory: byCategoryRows.map((row) => ({ category: row.category, amount: Number(row.total) })),
      commissionLists: listRows,
    };
  }

  return {
    owner,
    payoutPercent,
    products: enrichedProducts,
    providers: providerRows.map((provider) => ({
      ...provider,
      partnerType: provider.partnerType ?? "provider",
      regions: provider.regions ?? [],
      notes: owner ? provider.notes ?? "" : "",
    })),
    updates,
    ownerData,
  };
}
