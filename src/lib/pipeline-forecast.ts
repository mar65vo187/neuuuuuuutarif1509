import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";

export type PipelineForecastMonth = {
  month: string;
  leads: number;
  valueCents: number;
  weightedCents: number;
};

export type PipelineForecast = {
  openLeads: number;
  leadsWithValue: number;
  valueCents: number;
  weightedCents: number;
  overdueCloseDates: number;
  months: PipelineForecastMonth[];
  lostReasons: { reason: string | null; count: number }[];
  advisors: PipelineForecastAdvisor[];
  responseTimes: LeadResponseTime[];
};

export type PipelineForecastAdvisor = {
  employeeId: number | null;
  name: string;
  openLeads: number;
  leadsWithValue: number;
  valueCents: number;
  weightedCents: number;
};

/** Speed to lead over the last 90 days: time from lead creation to the first logged call. */
export type LeadResponseTime = {
  employeeId: number | null;
  name: string;
  leads: number;
  contacted: number;
  within24h: number;
  medianHours: number | null;
};

/**
 * Weighted pipeline forecast from advisor estimates on open leads.
 * Weighted value = deal value × win probability. Leads without a probability
 * count with 0 % so that missing estimates never inflate the forecast.
 */
export async function getPipelineForecast(user: SessionUser): Promise<PipelineForecast> {
  const access = leadAccessCondition(user);
  const open = sql`${leads.status} not in ('abgeschlossen', 'verloren')`;
  const weighted = sql`${leads.dealValueCents} * coalesce(${leads.winProbability}, 0) / 100.0`;
  const monthKey = sql<string>`to_char(date_trunc('month', ${leads.expectedCloseAt}), 'YYYY-MM')`;

  const owner = sql`coalesce(${leads.assignedEmployeeId}, ${leads.createdByEmployeeId})`;
  const [totals, months, lostReasons, advisorRows, responseRows] = await Promise.all([
    db.select({
      openLeads: sql<number>`count(*)::int`,
      leadsWithValue: sql<number>`count(*) filter (where ${leads.dealValueCents} is not null)::int`,
      valueCents: sql<number>`coalesce(sum(${leads.dealValueCents}), 0)::double precision`,
      weightedCents: sql<number>`coalesce(sum(${weighted}), 0)::double precision`,
      overdueCloseDates: sql<number>`count(*) filter (where ${leads.expectedCloseAt} < current_date)::int`,
    }).from(leads).where(and(access, open)),
    db.select({
      month: monthKey,
      leads: sql<number>`count(*)::int`,
      valueCents: sql<number>`coalesce(sum(${leads.dealValueCents}), 0)::double precision`,
      weightedCents: sql<number>`coalesce(sum(${weighted}), 0)::double precision`,
    }).from(leads)
      .where(and(
        access,
        open,
        sql`${leads.expectedCloseAt} >= date_trunc('month', current_date)::date`,
        sql`${leads.expectedCloseAt} < (date_trunc('month', current_date) + interval '6 months')::date`,
      ))
      .groupBy(monthKey)
      .orderBy(monthKey),
    db.select({
      reason: leads.lostReason,
      count: sql<number>`count(*)::int`,
    }).from(leads)
      .where(and(
        access,
        eq(leads.status, "verloren"),
        sql`${leads.closedAt} >= now() - interval '365 days'`,
      ))
      .groupBy(leads.lostReason)
      .orderBy(sql`count(*) desc`),
    db.execute(sql`
      select ${owner} as employee_id,
        coalesce((select e.name from employees e where e.id = ${owner}), 'Nicht zugeordnet') as name,
        count(*)::int as open_leads,
        count(*) filter (where ${leads.dealValueCents} is not null)::int as leads_with_value,
        coalesce(sum(${leads.dealValueCents}), 0)::double precision as value_cents,
        coalesce(sum(${weighted}), 0)::double precision as weighted_cents
      from ${leads}
      where ${access} and ${open}
      group by 1, 2
      order by 2`),
    db.execute(sql`
      select base.employee_id,
        coalesce((select e.name from employees e where e.id = base.employee_id), 'Nicht zugeordnet') as name,
        count(*)::int as leads,
        count(base.first_call)::int as contacted,
        count(*) filter (where base.first_call <= base.created_at + interval '24 hours')::int as within_24h,
        percentile_cont(0.5) within group (
          order by extract(epoch from (greatest(base.first_call, base.created_at) - base.created_at)) / 3600.0
        ) filter (where base.first_call is not null) as median_hours
      from (
        select ${owner} as employee_id, ${leads.createdAt} as created_at,
          (select min(c.called_at) from lead_call_activities c where c.lead_id = ${leads.id}) as first_call
        from ${leads}
        where ${access}
          and ${leads.createdAt} >= now() - interval '90 days'
          and ${leads.type} <> 'bewerbung'
      ) base
      group by 1, 2
      order by 2`),
  ]);

  const toNumber = (value: unknown) => Number(value ?? 0);

  const row = totals[0];
  return {
    openLeads: row?.openLeads ?? 0,
    leadsWithValue: row?.leadsWithValue ?? 0,
    valueCents: Math.round(Number(row?.valueCents ?? 0)),
    weightedCents: Math.round(Number(row?.weightedCents ?? 0)),
    overdueCloseDates: row?.overdueCloseDates ?? 0,
    months: months.map((month) => ({
      month: month.month,
      leads: month.leads,
      valueCents: Math.round(Number(month.valueCents)),
      weightedCents: Math.round(Number(month.weightedCents)),
    })),
    lostReasons: lostReasons.map((entry) => ({ reason: entry.reason, count: entry.count })),
    advisors: advisorRows.rows.map((raw) => {
      const entry = raw as Record<string, unknown>;
      return {
        employeeId: entry.employee_id === null || entry.employee_id === undefined ? null : toNumber(entry.employee_id),
        name: String(entry.name ?? "Nicht zugeordnet"),
        openLeads: toNumber(entry.open_leads),
        leadsWithValue: toNumber(entry.leads_with_value),
        valueCents: Math.round(toNumber(entry.value_cents)),
        weightedCents: Math.round(toNumber(entry.weighted_cents)),
      };
    }),
    responseTimes: responseRows.rows.map((raw) => {
      const entry = raw as Record<string, unknown>;
      return {
        employeeId: entry.employee_id === null || entry.employee_id === undefined ? null : toNumber(entry.employee_id),
        name: String(entry.name ?? "Nicht zugeordnet"),
        leads: toNumber(entry.leads),
        contacted: toNumber(entry.contacted),
        within24h: toNumber(entry.within_24h),
        medianHours: entry.median_hours === null || entry.median_hours === undefined ? null : Math.round(toNumber(entry.median_hours) * 10) / 10,
      };
    }),
  };
}
