import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mfaCredentials } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest, markCurrentSessionMfaVerified } from "@/lib/auth";
import { decryptMfaSecret, encryptMfaSecret, generateMfaSecret, otpAuthUri, verifyTotp } from "@/lib/mfa";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { writeAudit } from "@/lib/enterprise";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("enable"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("disable"), code: z.string().regex(/^\d{6}$/) }),
]);

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const [credential] = await db.select({ enabled: mfaCredentials.enabled, enabledAt: mfaCredentials.enabledAt })
    .from(mfaCredentials).where(eq(mfaCredentials.employeeId, user.id)).limit(1).catch(() => []);
  return NextResponse.json({ ok: true, enabled: credential?.enabled ?? false, enabledAt: credential?.enabledAt ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 8192));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige MFA-Anfrage." }, { status: 422 });
    if (parsed.data.action === "start") {
      const secret = generateMfaSecret();
      await db.insert(mfaCredentials).values({
        employeeId: user.id,
        secretEncrypted: encryptMfaSecret(secret),
        enabled: false,
      }).onConflictDoUpdate({
        target: mfaCredentials.employeeId,
        set: { secretEncrypted: encryptMfaSecret(secret), enabled: false, enabledAt: null, lastUsedAt: null },
      });
      return NextResponse.json({ ok: true, secret, uri: otpAuthUri(secret, user.email) });
    }
    const [credential] = await db.select().from(mfaCredentials).where(eq(mfaCredentials.employeeId, user.id)).limit(1);
    if (!credential) return NextResponse.json({ ok: false, error: "2FA wurde noch nicht eingerichtet." }, { status: 404 });
    const secret = decryptMfaSecret(credential.secretEncrypted);
    if (!verifyTotp(secret, parsed.data.code)) return NextResponse.json({ ok: false, error: "Der 2FA-Code ist nicht gültig." }, { status: 422 });
    if (parsed.data.action === "enable") {
      await db.transaction(async (tx) => {
        await tx.update(mfaCredentials).set({ enabled: true, enabledAt: new Date(), lastUsedAt: new Date() }).where(eq(mfaCredentials.employeeId, user.id));
        await writeAudit(tx, user.id, "mfa.enabled", "employee", user.id);
      });
      await markCurrentSessionMfaVerified(true);
      return NextResponse.json({ ok: true, enabled: true });
    }
    await db.transaction(async (tx) => {
      await tx.delete(mfaCredentials).where(eq(mfaCredentials.employeeId, user.id));
      await writeAudit(tx, user.id, "mfa.disabled", "employee", user.id);
    });
    await markCurrentSessionMfaVerified(false);
    return NextResponse.json({ ok: true, enabled: false });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "2FA konnte gerade nicht aktualisiert werden." }, { status: 500 });
  }
}
