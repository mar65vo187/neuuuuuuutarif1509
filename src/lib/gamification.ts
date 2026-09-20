import { pool } from "@/db";

import { EMPLOYEE_RACE_RULES, REFERRAL_AVATARS } from "@/lib/gamification-rules";

export { EMPLOYEE_RACE_RULES, REFERRAL_AVATARS } from "@/lib/gamification-rules";

export type EmployeeRaceRow = {
  employeeId: number;
  name: string;
  imageUrl: string | null;
  qualifiedLeads: number;
  b2bLeads: number;
  b2cCloses: number;
  b2bCloses: number;
  points: number;
  rank: number;
};

export type ReferralTowerRow = {
  displayName: string;
  avatarKey: string;
  referrals: number;
  successes: number;
  rank: number;
};

export type GamificationPeriod = {
  key: string;
  label: string;
};

function berlinPeriod(now = new Date()): GamificationPeriod {
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

export async function getEmployeeRace(now = new Date()) {
  const period = berlinPeriod(now);
  const result = await pool.query<{
    employee_id: number;
    name: string;
    image_url: string | null;
    qualified_leads: number;
    b2b_leads: number;
    b2c_closes: number;
    b2b_closes: number;
  }>(`
    WITH bounds AS (
      SELECT
        date_trunc('month', timezone('Europe/Berlin', now())) AT TIME ZONE 'Europe/Berlin' AS starts_at,
        (date_trunc('month', timezone('Europe/Berlin', now())) + interval '1 month') AT TIME ZONE 'Europe/Berlin' AS ends_at
    ),
    lead_scores AS (
      SELECT
        l.created_by_employee_id AS employee_id,
        count(*) FILTER (
          WHERE nullif(trim(coalesce(l.topic, '')), '') IS NOT NULL
            AND (
              nullif(trim(coalesce(l.email, '')), '') IS NOT NULL
              OR nullif(trim(coalesce(l.phone, '')), '') IS NOT NULL
            )
        )::int AS qualified_leads,
        count(*) FILTER (
          WHERE nullif(trim(coalesce(l.topic, '')), '') IS NOT NULL
            AND (
              nullif(trim(coalesce(l.email, '')), '') IS NOT NULL
              OR nullif(trim(coalesce(l.phone, '')), '') IS NOT NULL
            )
            AND coalesce(l.meta->>'audience', 'b2c') = 'b2b'
        )::int AS b2b_leads
      FROM leads l
      CROSS JOIN bounds b
      WHERE l.created_at >= b.starts_at
        AND l.created_at < b.ends_at
        AND l.created_by_employee_id IS NOT NULL
      GROUP BY l.created_by_employee_id
    ),
    close_scores AS (
      SELECT
        o.advisor_employee_id AS employee_id,
        count(DISTINCT o.id) FILTER (
          WHERE coalesce(l.meta->>'audience', CASE WHEN c.type = 'business' THEN 'b2b' ELSE 'b2c' END) <> 'b2b'
        )::int AS b2c_closes,
        count(DISTINCT o.id) FILTER (
          WHERE coalesce(l.meta->>'audience', CASE WHEN c.type = 'business' THEN 'b2b' ELSE 'b2c' END) = 'b2b'
        )::int AS b2b_closes
      FROM order_status_history osh
      CROSS JOIN bounds b
      INNER JOIN orders o ON o.id = osh.order_id
      INNER JOIN customers c ON c.id = o.customer_id
      LEFT JOIN leads l ON l.id = o.lead_id
      WHERE osh.to_status = 'active'
        AND osh.created_at >= b.starts_at
        AND osh.created_at < b.ends_at
        AND o.advisor_employee_id IS NOT NULL
      GROUP BY o.advisor_employee_id
    )
    SELECT
      e.id AS employee_id,
      e.name,
      e.image_url,
      coalesce(ls.qualified_leads, 0)::int AS qualified_leads,
      coalesce(ls.b2b_leads, 0)::int AS b2b_leads,
      coalesce(cs.b2c_closes, 0)::int AS b2c_closes,
      coalesce(cs.b2b_closes, 0)::int AS b2b_closes
    FROM employees e
    LEFT JOIN lead_scores ls ON ls.employee_id = e.id
    LEFT JOIN close_scores cs ON cs.employee_id = e.id
    WHERE e.active = true
      AND e.role = 'berater'
    ORDER BY e.name
  `);

  const rows = result.rows.map((row) => {
    const points =
      row.qualified_leads * EMPLOYEE_RACE_RULES.qualifiedLead
      + row.b2b_leads * EMPLOYEE_RACE_RULES.b2bLeadBonus
      + row.b2c_closes * EMPLOYEE_RACE_RULES.b2cClose
      + row.b2b_closes * EMPLOYEE_RACE_RULES.b2bClose;
    return {
      employeeId: row.employee_id,
      name: row.name,
      imageUrl: row.image_url,
      qualifiedLeads: row.qualified_leads,
      b2bLeads: row.b2b_leads,
      b2cCloses: row.b2c_closes,
      b2bCloses: row.b2b_closes,
      points,
    };
  }).sort((a, b) => b.points - a.points || b.b2bCloses - a.b2bCloses || a.name.localeCompare(b.name, "de"));

  const ranked: EmployeeRaceRow[] = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  const maxPoints = Math.max(0, ...ranked.map((row) => row.points));
  const trackLength = Math.max(20, Math.ceil(Math.max(maxPoints, 1) / 10) * 10);

  return {
    period,
    rules: EMPLOYEE_RACE_RULES,
    trackLength,
    rows: ranked,
  };
}

export async function getReferralTower(now = new Date()) {
  const period = berlinPeriod(now);
  const result = await pool.query<{
    display_name: string;
    avatar_key: string;
    referrals: number;
    successes: number;
  }>(`
    WITH bounds AS (
      SELECT
        date_trunc('month', timezone('Europe/Berlin', now())) AT TIME ZONE 'Europe/Berlin' AS starts_at,
        (date_trunc('month', timezone('Europe/Berlin', now())) + interval '1 month') AT TIME ZONE 'Europe/Berlin' AS ends_at
    ),
    referral_counts AS (
      SELECT rf.referrer_id, count(*)::int AS referrals
      FROM referrals rf
      CROSS JOIN bounds b
      WHERE rf.created_at >= b.starts_at AND rf.created_at < b.ends_at
      GROUP BY rf.referrer_id
    ),
    success_counts AS (
      SELECT rr.referrer_id, count(*)::int AS successes
      FROM referral_rewards rr
      CROSS JOIN bounds b
      WHERE rr.created_at >= b.starts_at
        AND rr.created_at < b.ends_at
        AND rr.status IN ('completed','approved','paid')
      GROUP BY rr.referrer_id
    )
    SELECT
      coalesce(nullif(trim(r.display_name), ''), split_part(r.name, ' ', 1), 'Teilnehmer') AS display_name,
      coalesce(nullif(r.avatar_key, ''), 'rocket') AS avatar_key,
      coalesce(rc.referrals, 0)::int AS referrals,
      coalesce(sc.successes, 0)::int AS successes
    FROM referrers r
    LEFT JOIN referral_counts rc ON rc.referrer_id = r.id
    LEFT JOIN success_counts sc ON sc.referrer_id = r.id
    WHERE r.active = true
      AND r.leaderboard_opt_in = true
      AND (coalesce(rc.referrals, 0) > 0 OR coalesce(sc.successes, 0) > 0)
    ORDER BY coalesce(sc.successes, 0) DESC, coalesce(rc.referrals, 0) DESC, display_name ASC
    LIMIT 100
  `);

  const rows: ReferralTowerRow[] = result.rows.map((row, index) => ({
    displayName: row.display_name.slice(0, 40),
    avatarKey: REFERRAL_AVATARS.some((avatar) => avatar.key === row.avatar_key) ? row.avatar_key : "rocket",
    referrals: row.referrals,
    successes: row.successes,
    rank: index + 1,
  }));

  return {
    period,
    rows,
    maxSuccesses: Math.max(1, ...rows.map((row) => row.successes)),
  };
}
