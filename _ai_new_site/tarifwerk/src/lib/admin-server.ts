import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";

export const accountSelection = {
  id: employees.id, name: employees.name, email: employees.email,
  role: employees.role, active: employees.active, advisorId: employees.advisorId,
};

export async function listAdminAccounts() {
  return db.select({ ...accountSelection, advisor: advisors }).from(employees)
    .leftJoin(advisors, eq(employees.advisorId, advisors.id)).orderBy(asc(employees.name));
}

export async function authorizeAdmin(request: NextRequest, mutation = true) {
  if (mutation && !isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage ist nicht zulässig." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen Benutzer verwalten." }, { status: 403 });
  return user;
}

export class AdminRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readBoundedBody(request: NextRequest, maximum: number) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) throw new AdminRequestError("Die Datei oder Anfrage ist zu groß.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AdminRequestError("Die Anfrage enthält keine Daten.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new AdminRequestError("Die Datei oder Anfrage ist zu groß.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function readAdminJson(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AdminRequestError("JSON-Daten erwartet.", 415);
  const body = await readBoundedBody(request, 32 * 1024);
  try { return JSON.parse(body.toString("utf8")) as unknown; }
  catch { throw new AdminRequestError("Die Anfrage ist ungültig.", 400); }
}

export function positiveId(raw: string) {
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new AdminRequestError("Ungültige ID.", 400);
  return id;
}

export function adminFailure(error: unknown) {
  if (error instanceof AdminRequestError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const databaseError = error as { code?: string; cause?: { code?: string } };
  if (databaseError?.code === "23505" || databaseError?.cause?.code === "23505") {
    return NextResponse.json({ ok: false, error: "Diese E-Mail-Adresse oder dieser Profil-Link wird bereits verwendet." }, { status: 409 });
  }
  console.error("[admin] Speichern oder Laden fehlgeschlagen", databaseError?.code ?? databaseError?.cause?.code ?? "unavailable");
  return NextResponse.json({ ok: false, error: "Die Daten konnten gerade nicht gespeichert oder geladen werden. Bitte erneut versuchen." }, { status: 503 });
}
