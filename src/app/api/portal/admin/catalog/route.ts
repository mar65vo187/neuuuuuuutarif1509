import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productCatalogProfiles, products, productUpdates, providerProfiles, providers } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { hubCreateSchema, hubUpdateSchema } from "@/lib/product-hub-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = hubCreateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      if (parsed.data.kind === "provider") {
        const [created] = await tx.insert(providers).values({
          name: parsed.data.name,
          category: parsed.data.category,
          externalPartnerId: parsed.data.externalPartnerId || null,
        }).returning();
        await tx.insert(providerProfiles).values({
          providerId: created.id,
          partnerType: parsed.data.partnerType,
          websiteUrl: parsed.data.websiteUrl || null,
          portalUrl: parsed.data.portalUrl || null,
          contactName: parsed.data.contactName || null,
          contactPhone: parsed.data.contactPhone || null,
          contactEmail: parsed.data.contactEmail || null,
          supportContact: parsed.data.supportContact || null,
          billingPath: parsed.data.billingPath || null,
          regions: parsed.data.regions,
          notes: parsed.data.notes || "",
          updatedByEmployeeId: admin.id,
        });
        await writeAudit(tx, admin.id, "provider.created", "provider", created.id, undefined, { name: created.name, category: created.category });
        return { kind: "provider", id: created.id };
      }

      const [provider] = await tx.select({ id: providers.id }).from(providers)
        .where(eq(providers.id, parsed.data.providerId)).limit(1);
      if (!provider) throw new Error("PARTNER_NOT_FOUND");

      const [created] = await tx.insert(products).values({
        providerId: parsed.data.providerId,
        name: parsed.data.name,
        category: parsed.data.category,
        sku: parsed.data.sku || null,
        active: !["ended", "do_not_market"].includes(parsed.data.lifecycleStatus),
      }).returning();

      await tx.insert(productCatalogProfiles).values({
        productId: created.id,
        audience: parsed.data.audience,
        lifecycleStatus: parsed.data.lifecycleStatus,
        description: parsed.data.description || "",
        imageUrl: parsed.data.imageUrl || null,
        region: parsed.data.region,
        submissionUrl: parsed.data.submissionUrl || null,
        supportContact: parsed.data.supportContact || null,
        completionProcess: parsed.data.completionProcess || "",
        marketingChannels: parsed.data.marketingChannels,
        marketingConditions: parsed.data.marketingConditions || "",
        salesArguments: parsed.data.salesArguments,
        objections: parsed.data.objections,
        shortPitch: parsed.data.shortPitch || "",
        phonePitch: parsed.data.phonePitch || "",
        d2dPitch: parsed.data.d2dPitch || "",
        b2bPitch: parsed.data.b2bPitch || "",
        whatsappTemplate: parsed.data.whatsappTemplate || "",
        emailTemplate: parsed.data.emailTemplate || "",
        socialIdeas: parsed.data.socialIdeas,
        checklist: parsed.data.checklist,
        requiredDocuments: parsed.data.requiredDocuments,
        trainingRequired: parsed.data.trainingRequired,
        highlight: parsed.data.highlight || null,
        updatedByEmployeeId: admin.id,
      });

      await tx.insert(productUpdates).values({
        productId: created.id,
        providerId: created.providerId,
        updateType: "info",
        title: `Neues Produkt: ${created.name}`,
        body: "Das Produkt wurde in den internen TarifWerk-Katalog aufgenommen.",
        important: false,
        createdByEmployeeId: admin.id,
      });

      await writeAudit(tx, admin.id, "product.created", "product", created.id, undefined, {
        name: created.name,
        providerId: created.providerId,
        lifecycleStatus: parsed.data.lifecycleStatus,
      });
      return { kind: "product", id: created.id };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PARTNER_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Partner nicht gefunden." }, { status: 404 });
    }
    return adminFailure(error);
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = hubUpdateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);

      if (parsed.data.kind === "provider") {
        const [existing] = await tx.select().from(providers).where(eq(providers.id, parsed.data.id)).limit(1).for("update");
        if (!existing) throw new Error("PARTNER_NOT_FOUND");

        const providerPatch: Partial<typeof providers.$inferInsert> = { updatedAt: new Date() };
        if (parsed.data.name !== undefined) providerPatch.name = parsed.data.name;
        if (parsed.data.category !== undefined) providerPatch.category = parsed.data.category;
        if (parsed.data.externalPartnerId !== undefined) providerPatch.externalPartnerId = parsed.data.externalPartnerId || null;
        if (parsed.data.active !== undefined) providerPatch.active = parsed.data.active;
        await tx.update(providers).set(providerPatch).where(eq(providers.id, existing.id));

        const [currentProfile] = await tx.select().from(providerProfiles)
          .where(eq(providerProfiles.providerId, existing.id)).limit(1);
        const owner = isCompensationOwner(admin);
        const profilePatch = {
          partnerType: parsed.data.partnerType ?? currentProfile?.partnerType ?? "provider",
          websiteUrl: parsed.data.websiteUrl === undefined ? currentProfile?.websiteUrl ?? null : parsed.data.websiteUrl || null,
          portalUrl: parsed.data.portalUrl === undefined ? currentProfile?.portalUrl ?? null : parsed.data.portalUrl || null,
          contactName: parsed.data.contactName === undefined ? currentProfile?.contactName ?? null : parsed.data.contactName || null,
          contactPhone: parsed.data.contactPhone === undefined ? currentProfile?.contactPhone ?? null : parsed.data.contactPhone || null,
          contactEmail: parsed.data.contactEmail === undefined ? currentProfile?.contactEmail ?? null : parsed.data.contactEmail || null,
          supportContact: parsed.data.supportContact === undefined ? currentProfile?.supportContact ?? null : parsed.data.supportContact || null,
          billingPath: parsed.data.billingPath === undefined ? currentProfile?.billingPath ?? null : parsed.data.billingPath || null,
          regions: parsed.data.regions ?? currentProfile?.regions ?? [],
          notes: owner && parsed.data.notes !== undefined ? parsed.data.notes : currentProfile?.notes ?? "",
          updatedByEmployeeId: admin.id,
          updatedAt: new Date(),
        };
        await tx.insert(providerProfiles).values({ providerId: existing.id, ...profilePatch })
          .onConflictDoUpdate({ target: providerProfiles.providerId, set: profilePatch });

        await writeAudit(tx, admin.id, "provider.updated", "provider", existing.id, {
          name: existing.name, category: existing.category, externalPartnerId: existing.externalPartnerId, active: existing.active,
        }, parsed.data);
        return { kind: "provider", id: existing.id };
      }

      const [existing] = await tx.select().from(products).where(eq(products.id, parsed.data.id)).limit(1).for("update");
      if (!existing) throw new Error("PRODUCT_NOT_FOUND");
      if (parsed.data.providerId !== undefined) {
        const [provider] = await tx.select({ id: providers.id }).from(providers).where(eq(providers.id, parsed.data.providerId)).limit(1);
        if (!provider) throw new Error("PARTNER_NOT_FOUND");
      }

      const productPatch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
      if (parsed.data.providerId !== undefined) productPatch.providerId = parsed.data.providerId;
      if (parsed.data.name !== undefined) productPatch.name = parsed.data.name;
      if (parsed.data.category !== undefined) productPatch.category = parsed.data.category;
      if (parsed.data.sku !== undefined) productPatch.sku = parsed.data.sku || null;
      if (parsed.data.lifecycleStatus !== undefined) {
        productPatch.active = !["paused", "do_not_market", "ended"].includes(parsed.data.lifecycleStatus);
      } else if (parsed.data.active !== undefined) {
        productPatch.active = parsed.data.active;
      }
      await tx.update(products).set(productPatch).where(eq(products.id, existing.id));

      const [currentProfile] = await tx.select().from(productCatalogProfiles)
        .where(eq(productCatalogProfiles.productId, existing.id)).limit(1);
      const profilePatch = {
        audience: parsed.data.audience ?? currentProfile?.audience ?? "both",
        lifecycleStatus: parsed.data.lifecycleStatus ?? currentProfile?.lifecycleStatus ?? (existing.active ? "active" : "ended"),
        description: parsed.data.description ?? currentProfile?.description ?? "",
        imageUrl: parsed.data.imageUrl === undefined ? currentProfile?.imageUrl ?? null : parsed.data.imageUrl || null,
        region: parsed.data.region ?? currentProfile?.region ?? "Deutschland",
        submissionUrl: parsed.data.submissionUrl === undefined ? currentProfile?.submissionUrl ?? null : parsed.data.submissionUrl || null,
        supportContact: parsed.data.supportContact === undefined ? currentProfile?.supportContact ?? null : parsed.data.supportContact || null,
        completionProcess: parsed.data.completionProcess ?? currentProfile?.completionProcess ?? "",
        marketingChannels: parsed.data.marketingChannels ?? currentProfile?.marketingChannels ?? [],
        marketingConditions: parsed.data.marketingConditions ?? currentProfile?.marketingConditions ?? "",
        salesArguments: parsed.data.salesArguments ?? currentProfile?.salesArguments ?? [],
        objections: parsed.data.objections ?? currentProfile?.objections ?? [],
        shortPitch: parsed.data.shortPitch ?? currentProfile?.shortPitch ?? "",
        phonePitch: parsed.data.phonePitch ?? currentProfile?.phonePitch ?? "",
        d2dPitch: parsed.data.d2dPitch ?? currentProfile?.d2dPitch ?? "",
        b2bPitch: parsed.data.b2bPitch ?? currentProfile?.b2bPitch ?? "",
        whatsappTemplate: parsed.data.whatsappTemplate ?? currentProfile?.whatsappTemplate ?? "",
        emailTemplate: parsed.data.emailTemplate ?? currentProfile?.emailTemplate ?? "",
        socialIdeas: parsed.data.socialIdeas ?? currentProfile?.socialIdeas ?? [],
        checklist: parsed.data.checklist ?? currentProfile?.checklist ?? [],
        requiredDocuments: parsed.data.requiredDocuments ?? currentProfile?.requiredDocuments ?? [],
        trainingRequired: parsed.data.trainingRequired ?? currentProfile?.trainingRequired ?? false,
        highlight: parsed.data.highlight === undefined ? currentProfile?.highlight ?? null : parsed.data.highlight || null,
        updatedByEmployeeId: admin.id,
        updatedAt: new Date(),
      };
      await tx.insert(productCatalogProfiles).values({ productId: existing.id, ...profilePatch })
        .onConflictDoUpdate({ target: productCatalogProfiles.productId, set: profilePatch });

      if (parsed.data.lifecycleStatus !== undefined && parsed.data.lifecycleStatus !== currentProfile?.lifecycleStatus) {
        await tx.insert(productUpdates).values({
          productId: existing.id,
          providerId: parsed.data.providerId ?? existing.providerId,
          updateType: ["paused", "do_not_market", "ended"].includes(parsed.data.lifecycleStatus) ? "stop" : "process",
          title: `Produktstatus geändert: ${parsed.data.name ?? existing.name}`,
          body: `Neuer Status: ${parsed.data.lifecycleStatus}`,
          important: ["do_not_market", "ended"].includes(parsed.data.lifecycleStatus),
          createdByEmployeeId: admin.id,
        });
      }

      await writeAudit(tx, admin.id, "product.updated", "product", existing.id, {
        name: existing.name, providerId: existing.providerId, category: existing.category, sku: existing.sku, active: existing.active,
      }, parsed.data);
      return { kind: "product", id: existing.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "PARTNER_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Partner nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Produkt nicht gefunden." }, { status: 404 });
    }
    return adminFailure(error);
  }
}
