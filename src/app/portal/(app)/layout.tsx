import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { PortalShell } from "@/components/portal/PortalShell";
import { getCurrentUser } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Portal", robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const requested = (await headers()).get("x-tarifwerk-portal-path") ?? "/portal";
    redirect(`/portal/login?next=${encodeURIComponent(requested)}`);
  }

  let openCount = 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(eq(leads.status, "neu"), leadAccessCondition(user)));
    openCount = row?.count ?? 0;
  } catch {
    openCount = 0;
  }

  return (
    <PortalShell user={user} openCount={openCount}>
      {children}
    </PortalShell>
  );
}
