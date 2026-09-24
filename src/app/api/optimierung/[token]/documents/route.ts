import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { writeOptimizationEvent } from "@/lib/optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function validToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}

function safeFilename(value: string) {
  return value.replace(/[\u0000-\u001f\u007f/\\]/g, "_").slice(0, 180) || "dokument";
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const { token } = await context.params;
  if (!validToken(token)) return NextResponse.json({ ok: false, error: "Zugang ungültig." }, { status: 404 });

  const subResult = await pool.query<{ id: number; status: string; billing_status: string }>(
    "select id,status,billing_status from optimization_subscriptions where public_token=$1 limit 1",
    [token],
  );
  const sub = subResult.rows[0];
  if (!sub) return NextResponse.json({ ok: false, error: "Zugang ungültig." }, { status: 404 });
  if (sub.status !== "active" || sub.billing_status !== "active") {
    return NextResponse.json({ ok: false, error: "Das Abo ist noch nicht aktiv." }, { status: 402 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Upload konnte nicht gelesen werden." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Bitte Datei auswählen." }, { status: 422 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ ok: false, error: "Erlaubt sind PDF, JPG, PNG und WEBP." }, { status: 415 });
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "Datei darf maximal 8 MB groß sein." }, { status: 413 });

  const requestIdRaw = String(form.get("requestId") ?? "").trim();
  const requestId = requestIdRaw ? Number(requestIdRaw) : null;
  if (requestId != null && (!Number.isInteger(requestId) || requestId <= 0)) {
    return NextResponse.json({ ok: false, error: "Ungültiger Vorgang." }, { status: 422 });
  }
  if (requestId != null) {
    const check = await pool.query("select 1 from optimization_requests where id=$1 and subscription_id=$2", [requestId, sub.id]);
    if (!check.rowCount) return NextResponse.json({ ok: false, error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  const category = String(form.get("category") ?? "contract").trim().slice(0, 60) || "contract";
  const buffer = Buffer.from(await file.arrayBuffer());
  const digest = createHash("sha256").update(buffer).digest("hex");
  const created = await pool.query<{ id: number }>(
    "insert into optimization_documents(subscription_id,request_id,category,filename,content_type,size_bytes,digest,data,source)" +
    " values($1,$2,$3,$4,$5,$6,$7,$8,'customer') returning id",
    [sub.id, requestId, category, safeFilename(file.name), file.type, buffer.length, digest, buffer],
  );
  const documentId = created.rows[0]?.id;
  await writeOptimizationEvent({
    subscriptionId: sub.id,
    requestId,
    actorType: "customer",
    eventType: "document.uploaded",
    payload: { documentId, category, contentType: file.type, sizeBytes: buffer.length },
  });
  return NextResponse.json({ ok: true, id: documentId }, { status: 201 });
}
