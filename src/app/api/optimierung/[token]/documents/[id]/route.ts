import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("Nicht gefunden", { status: 404 });
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) return new Response("Nicht gefunden", { status: 404 });
  const result = await pool.query<{ filename: string; content_type: string; data: Buffer }>(
    "select d.filename,d.content_type,d.data from optimization_documents d join optimization_subscriptions s on s.id=d.subscription_id" +
    " where d.id=$1 and s.public_token=$2 limit 1",
    [documentId, token],
  );
  const row = result.rows[0];
  if (!row) return new Response("Nicht gefunden", { status: 404 });
  const safeName = row.filename.replace(/[\r\n"]/g, "_");
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.content_type,
      "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(safeName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
