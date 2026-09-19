import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employeeImages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new NextResponse(null, { status: 401, headers: { "Cache-Control": "no-store" } });

  const rawId = (await context.params).id;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return new NextResponse(null, { status: 404 });

  try {
    const [image] = await db.select({
      data: employeeImages.data,
      contentType: employeeImages.contentType,
      digest: employeeImages.digest,
    }).from(employeeImages).where(eq(employeeImages.employeeId, id)).limit(1);

    if (!image) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const headers = {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ETag: `"${image.digest}"`,
    };
    if (request.headers.get("if-none-match") === headers.ETag) return new NextResponse(null, { status: 304, headers });
    return new NextResponse(new Uint8Array(image.data), { headers });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
