import { NextResponse, type NextRequest } from "next/server";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { commissionListVersions, commissionRateVersions, internalDocuments, products, productUpdates, providers } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { commissionImportSchema } from "@/lib/product-hub-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provisionslisten importieren." }, { status: 403 });
    }

    const parsed = commissionImportSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Provisionsliste ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [provider] = await tx.select({ id: providers.id, name: providers.name }).from(providers)
        .where(eq(providers.id, parsed.data.providerId)).limit(1);
      if (!provider) throw new Error("PROVIDER_NOT_FOUND");

      if (parsed.data.sourceDocumentId) {
        const [sourceDocument] = await tx.select({ id: internalDocuments.id, providerId: internalDocuments.providerId, category: internalDocuments.category })
          .from(internalDocuments).where(eq(internalDocuments.id, parsed.data.sourceDocumentId)).limit(1);
        if (!sourceDocument || sourceDocument.providerId !== provider.id || sourceDocument.category !== "commission_list_source") {
          throw new Error("SOURCE_DOCUMENT_MISMATCH");
        }
      }

      const [versionRow] = await tx.select({ version: max(commissionListVersions.version) })
        .from(commissionListVersions)
        .where(eq(commissionListVersions.providerId, provider.id));
      const version = Number(versionRow?.version ?? 0) + 1;

      const [list] = await tx.insert(commissionListVersions).values({
        providerId: provider.id,
        version,
        sourceName: parsed.data.sourceName,
        sourceType: parsed.data.sourceType,
        sourceDocumentId: parsed.data.sourceDocumentId ?? null,
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        ownerPoolPercent: "15.00",
        importedByEmployeeId: admin.id,
      }).returning({ id: commissionListVersions.id });

      const providerProducts = await tx.select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      }).from(products).where(eq(products.providerId, provider.id));

      const byId = new Map(providerProducts.map((product) => [product.id, product]));
      const byName = new Map(providerProducts.map((product) => [product.name.trim().toLowerCase(), product]));
      const bySku = new Map(providerProducts.filter((product) => product.sku).map((product) => [product.sku!.trim().toLowerCase(), product]));

      let matched = 0;
      let totalGross = 0;
      for (const row of parsed.data.rows) {
        const explicit = row.productId ? byId.get(row.productId) : undefined;
        const skuMatch = row.externalProductId ? bySku.get(row.externalProductId.trim().toLowerCase()) : undefined;
        const nameMatch = byName.get(row.productName.trim().toLowerCase());
        const product = explicit ?? skuMatch ?? nameMatch;
        if (row.productId && !product) throw new Error("PRODUCT_MISMATCH");
        if (product) matched += 1;
        totalGross += row.grossAmount;

        await tx.insert(commissionRateVersions).values({
          commissionListVersionId: list.id,
          productId: product?.id ?? null,
          externalProductId: row.externalProductId || null,
          productName: row.productName,
          category: row.category,
          grossAmount: String(row.grossAmount),
          points: String(row.points ?? 0),
          rewardNote: row.rewardNote || "",
          validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
          validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        });

        if (product) {
          await tx.update(products).set({
            expectedCommission: String(row.grossAmount),
            updatedAt: new Date(),
          }).where(and(eq(products.id, product.id), eq(products.providerId, provider.id)));
        }
      }

      await tx.insert(productUpdates).values({
        providerId: provider.id,
        updateType: "commission",
        title: `Neue Provisionsliste: ${provider.name} · Version ${version}`,
        body: `${parsed.data.rows.length} Positionen wurden importiert. ${matched} Positionen konnten Produkten direkt zugeordnet werden.`,
        important: true,
        createdByEmployeeId: admin.id,
      });

      await writeAudit(tx, admin.id, "commission_list.imported", "provider", provider.id, undefined, {
        version,
        rows: parsed.data.rows.length,
        matched,
        sourceName: parsed.data.sourceName,
        sourceDocumentId: parsed.data.sourceDocumentId ?? null,
        totalPoints: parsed.data.rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0),
      });

      return {
        version,
        rows: parsed.data.rows.length,
        matched,
        unmatched: parsed.data.rows.length - matched,
        potentialOwnerPool: totalGross * 0.15,
      };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PROVIDER_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Partner nicht gefunden." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "SOURCE_DOCUMENT_MISMATCH") {
      return NextResponse.json({ ok: false, error: "Die hochgeladene Quelldatei gehört nicht zu diesem Partner." }, { status: 422 });
    }
    if (error instanceof Error && error.message === "PRODUCT_MISMATCH") {
      return NextResponse.json({ ok: false, error: "Mindestens eine Produkt-ID gehört nicht zu diesem Partner." }, { status: 422 });
    }
    return adminFailure(error);
  }
}
