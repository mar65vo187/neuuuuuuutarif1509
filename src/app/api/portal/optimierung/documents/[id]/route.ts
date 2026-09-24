import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const documentId = Number((await context.params).id);
  if (!Number.isInteger(documentId) || documentId <= 0) return new Response("Nicht gefunden", { status: 404 });
  const result = await pool.query<{ filename: string; content_type: string; data: Buffer; owner_employee_id: number | null; customer_owner_employee_id: number | null; assigned_employee_id: number | null }>(
    "select d.filename,d.content_type,d.data,s.owner_employee_id,c.owner_employee_id as customer_owner_employee_id,r.assigned_employee_id" +
    " from optimization_documents d join optimization_subscriptions s on s.id=d.subscription_id left join customers c on c.id=s.customer_id" +
    " left join optimization_requests r on r.id=d.request_id where d.id=$1 limit 1",
    [documentId],
  );
  const row = result.rows[0];
  if (!row) return new Response("Nicht gefunden", { status: 404 });
  const allowed = user.role === "admin" || row.owner_employee_id === user.id || row.customer_owner_employee_id === user.id || row.assigned_employee_id === user.id;
  if (!allowed) return new Response("Keine Berechtigung", { status: 403 });
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
