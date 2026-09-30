import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisorLicenses, advisors } from "@/db/schema";

export type PublicLicense = {
  advisorName: string;
  advisorSlug: string;
  kind: string;
  status: string;
  holderName: string;
  businessAddress: string;
  registerNumber: string | null;
  authority: string;
  remuneration: string;
  noHoldingsConfirmed: boolean;
};

/** Active licenses of active, public advisors – the source of the public Erstinformation. */
export async function listPublicLicenses(): Promise<PublicLicense[]> {
  return db.select({
    advisorName: advisors.name,
    advisorSlug: advisors.slug,
    kind: advisorLicenses.kind,
    status: advisorLicenses.status,
    holderName: advisorLicenses.holderName,
    businessAddress: advisorLicenses.businessAddress,
    registerNumber: advisorLicenses.registerNumber,
    authority: advisorLicenses.authority,
    remuneration: advisorLicenses.remuneration,
    noHoldingsConfirmed: advisorLicenses.noHoldingsConfirmed,
  }).from(advisorLicenses)
    .innerJoin(advisors, eq(advisorLicenses.advisorId, advisors.id))
    .where(and(eq(advisorLicenses.active, true), eq(advisors.active, true)))
    .orderBy(asc(advisors.sortOrder), asc(advisors.name), asc(advisorLicenses.kind));
}

export async function listAdminLicenses() {
  return db.select().from(advisorLicenses)
    .where(eq(advisorLicenses.active, true))
    .orderBy(asc(advisorLicenses.advisorId), asc(advisorLicenses.kind));
}
