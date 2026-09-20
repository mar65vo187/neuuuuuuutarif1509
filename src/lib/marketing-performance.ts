import { pool } from "@/db";

export type MarketingPerformanceRow = {
  campaignKey: string;
  leads: number;
  qualified: number;
  completed: number;
  businessLeads: number;
  spendCents: number;
  cplCents: number | null;
  cpaCents: number | null;
};

export type MarketingPerformance = {
  period: { key: string; label: string };
  rows: MarketingPerformanceRow[];
  totals: {
    leads: number;
    qualified: number;
    completed: number;
    spendCents: number;
    cplCents: number | null;
    cpaCents: number | null;
  };
};

function berlinPeriod(now = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const label = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    month: "long",
    year: "numeric",
  }).format(now);
  return { key, label };
}

export async function getMarketingCampaignPerformance(now = new Date()): Promise<MarketingPerformance> {
  const period = berlinPeriod(now);
  const result = await pool.query<{
    campaign_key: string;
    leads: number;
    qualified: number;
    completed: number;
    business_leads: number;
    spend_cents: number;
  }>(`
    WITH bounds AS (
      SELECT
        date_trunc('month', timezone('Europe/Berlin', $1::timestamptz)) AT TIME ZONE 'Europe/Berlin' AS starts_at,
        (date_trunc('month', timezone('Europe/Berlin', $1::timestamptz)) + interval '1 month') AT TIME ZONE 'Europe/Berlin' AS ends_at
    ),
    lead_counts AS (
      SELECT
        CASE
          WHEN nullif(l.meta->>'utmCampaign','') LIKE 'tarifwerk_%'
            THEN regexp_replace(l.meta->>'utmCampaign', '^tarifwerk_', '')
          WHEN l.source LIKE 'kampagne:%'
            THEN regexp_replace(l.source, '^kampagne:', '')
          ELSE nullif(l.meta->>'utmCampaign','')
        END AS campaign_key,
        count(*)::int AS leads,
        count(*) FILTER (WHERE l.status IN ('termin_bestaetigt','in_beratung','abgeschlossen'))::int AS qualified,
        count(*) FILTER (WHERE l.status = 'abgeschlossen')::int AS completed,
        count(*) FILTER (WHERE l.meta->>'audience' = 'b2b')::int AS business_leads
      FROM leads l
      CROSS JOIN bounds b
      WHERE l.created_at >= b.starts_at
        AND l.created_at < b.ends_at
        AND (
          nullif(l.meta->>'utmCampaign','') IS NOT NULL
          OR l.source LIKE 'kampagne:%'
        )
      GROUP BY 1
    ),
    spend_counts AS (
      SELECT
        mcs.campaign_key,
        coalesce(sum(mcs.amount_cents),0)::int AS spend_cents
      FROM marketing_campaign_spend mcs
      CROSS JOIN bounds b
      WHERE mcs.spent_at >= b.starts_at
        AND mcs.spent_at < b.ends_at
      GROUP BY mcs.campaign_key
    )
    SELECT
      coalesce(lc.campaign_key, sc.campaign_key) AS campaign_key,
      coalesce(lc.leads, 0)::int AS leads,
      coalesce(lc.qualified, 0)::int AS qualified,
      coalesce(lc.completed, 0)::int AS completed,
      coalesce(lc.business_leads, 0)::int AS business_leads,
      coalesce(sc.spend_cents, 0)::int AS spend_cents
    FROM lead_counts lc
    FULL OUTER JOIN spend_counts sc ON sc.campaign_key = lc.campaign_key
    WHERE coalesce(lc.campaign_key, sc.campaign_key) IS NOT NULL
    ORDER BY coalesce(sc.spend_cents, 0) DESC, coalesce(lc.leads, 0) DESC, campaign_key
  `, [now.toISOString()]);

  const rows: MarketingPerformanceRow[] = result.rows.map((row) => ({
    campaignKey: row.campaign_key,
    leads: row.leads,
    qualified: row.qualified,
    completed: row.completed,
    businessLeads: row.business_leads,
    spendCents: row.spend_cents,
    cplCents: row.leads > 0 ? Math.round(row.spend_cents / row.leads) : null,
    cpaCents: row.completed > 0 ? Math.round(row.spend_cents / row.completed) : null,
  }));

  const totals = rows.reduce((acc, row) => ({
    leads: acc.leads + row.leads,
    qualified: acc.qualified + row.qualified,
    completed: acc.completed + row.completed,
    spendCents: acc.spendCents + row.spendCents,
  }), { leads: 0, qualified: 0, completed: 0, spendCents: 0 });

  return {
    period,
    rows,
    totals: {
      ...totals,
      cplCents: totals.leads > 0 ? Math.round(totals.spendCents / totals.leads) : null,
      cpaCents: totals.completed > 0 ? Math.round(totals.spendCents / totals.completed) : null,
    },
  };
}
