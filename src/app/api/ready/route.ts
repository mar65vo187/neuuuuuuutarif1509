import { pool } from "@/db";
import { hasProductionBusinessAddress } from "@/lib/business-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function revision() {
  return (
    process.env.GITHUB_SHA
    || process.env.GIT_SHA
    || "unknown"
  ).slice(0, 40);
}

export async function GET() {
  const started = Date.now();
  const missingConfiguration = [
    !hasProductionBusinessAddress() ? "BUSINESS_ADDRESS" : null,
  ].filter((value): value is string => Boolean(value));

  if (process.env.NODE_ENV === "production" && missingConfiguration.length > 0) {
    return Response.json(
      { ok: false, status: "not_ready", revision: revision(), missingConfiguration },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await pool.query<{ migration_count: number; latest_migration: string | null }>(
      "select count(*)::int as migration_count, max(name)::text as latest_migration from tarifwerk_migrations",
    );
    const row = result.rows[0];
    if (!row || Number(row.migration_count) < 1) {
      return Response.json(
        { ok: false, status: "not_ready", revision: revision() },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      {
        ok: true,
        status: "ready",
        revision: revision(),
        database: "ready",
        migrations: Number(row.migration_count),
        latestMigration: row.latest_migration,
        durationMs: Date.now() - started,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, status: "not_ready", revision: revision() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
