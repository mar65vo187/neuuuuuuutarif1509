import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { getCurrentUser, hashPassword, isSameOriginRequest, setSessionCookie, verifyPassword } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12, "Das neue Passwort muss mindestens 12 Zeichen enthalten.").max(200),
}).strict().refine((data) => data.currentPassword !== data.newPassword, {
  path: ["newPassword"],
  message: "Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.",
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht zulässig." }, { status: 403 });
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 4096);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
  }

  try {
    const [account] = await db.select({ id: employees.id, passwordHash: employees.passwordHash, active: employees.active })
      .from(employees).where(eq(employees.id, user.id)).limit(1);
    if (!account?.active) return NextResponse.json({ ok: false, error: "Der Benutzerzugang ist nicht aktiv." }, { status: 403 });

    const valid = await verifyPassword(parsed.data.currentPassword, account.passwordHash);
    if (!valid) return NextResponse.json({ ok: false, error: "Das aktuelle Passwort ist nicht korrekt." }, { status: 422 });

    const passwordHash = hashPassword(parsed.data.newPassword);
    await db.update(employees).set({ passwordHash }).where(eq(employees.id, user.id));

    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const secure = forwardedProtocol ? forwardedProtocol === "https" : request.nextUrl.protocol === "https:";
    await setSessionCookie(user.id, secure, passwordHash);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Das Passwort konnte gerade nicht geändert werden." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
