import { NextResponse, type NextRequest } from "next/server";
import { authorizeAdmin, adminFailure } from "@/lib/admin-server";
import { processOutbox } from "@/lib/outbox-worker";

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const result = await processOutbox(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) { return adminFailure(error); }
}
