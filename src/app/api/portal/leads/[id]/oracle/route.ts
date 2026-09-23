import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { getLead, getLeadCallActivities, getLeadProductLinks } from "@/lib/queries";
import { leadCouncilProviderStatus, runLeadCouncil } from "@/lib/lead-council";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 403;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." },
      { status: Number.isFinite(status) ? status : 403 },
    );
  }

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    return NextResponse.json({ ok: false, error: "Ungültige Lead-ID." }, { status: 400 });
  }

  const provider = leadCouncilProviderStatus();
  if (!provider.configured) {
    return NextResponse.json({
      ok: false,
      configurationRequired: true,
      error: "Die Lead-KI ist serverseitig noch nicht aktiviert. XKIRO_API_KEY fehlt.",
      models: provider,
    }, { status: 503 });
  }

  const lead = await getLead(id, user).catch(() => null);
  if (!lead) return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });

  try {
    const [productLinks, calls] = await Promise.all([
      getLeadProductLinks(id, user),
      getLeadCallActivities(id, user),
    ]);

    const result = await runLeadCouncil({
      leadId: lead.id,
      source: lead.source,
      topic: lead.topic,
      region: lead.region,
      situation: lead.situation,
      message: lead.message,
      preferredChannel: lead.preferredChannel,
      tags: lead.tags,
      meta: (lead.meta ?? {}) as Record<string, unknown>,
      products: productLinks.map((item) => ({
        name: item.productName,
        category: item.category,
        provider: item.providerName,
        relation: item.relation,
      })),
      calls: calls.slice(0, 8).map((call) => ({
        reachedPerson: call.reachedPerson,
        reaction: call.reaction,
      })),
    });

    return NextResponse.json({ ok: true, result }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[lead-oracle] council failed");
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Die Lead-KI konnte den Lead gerade nicht prüfen.",
    }, { status: 503 });
  }
}
