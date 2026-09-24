import { pool } from "@/db";
import type { SessionUser } from "@/lib/auth";

export const OPTIMIZATION_PLAN = {
  code: "optimierung_plus",
  name: "TarifWerk Optimierung+",
  priceCents: 199,
  currency: "EUR",
} as const;

export const OPTIMIZATION_TYPE_LABELS: Record<string, string> = {
  goal: "Ziel, Traum oder Wunsch",
  contract_review: "Vertrag prüfen & optimieren",
  internet_mobile_tv: "Internet, Mobilfunk & TV",
  energy: "Strom & Gas",
  insurance: "Versicherungen",
  solar_heatpump: "Solar & Wärmepumpe",
  property: "Immobilien",
  precious_metals: "Edelmetalle",
  climate: "Klima",
  security: "Sicherheit",
  other: "Sonstiges",
};

export const OPTIMIZATION_STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  qualified: "Geprüft",
  collecting_docs: "Unterlagen fehlen",
  market_scan: "Angebote werden geprüft",
  offers_ready: "3er-Vergleich bereit",
  waiting_customer: "Kundenentscheidung",
  accepted: "Angebot gewählt",
  implementation: "Umsetzung läuft",
  done: "Erledigt",
  paused: "Pausiert",
  canceled: "Abgebrochen",
};

export function euro(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function customerLabelSql(alias = "c") {
  return "coalesce(nullif(" + alias + ".company_name,''), nullif(trim(concat_ws(' '," + alias + ".first_name," + alias + ".last_name)),''), " + alias + ".customer_number)";
}

export async function getOptimizationHubData(user: SessionUser) {
  const admin = user.role === "admin";
  const params = admin ? [] : [user.id];
  const subScope = admin
    ? ""
    : "where (s.owner_employee_id = $1 or c.owner_employee_id = $1)";
  const requestScope = admin
    ? ""
    : "where (s.owner_employee_id = $1 or c.owner_employee_id = $1 or r.assigned_employee_id = $1)";

  const [statsResult, subscriptionsResult, requestsResult, employeesResult] = await Promise.all([
    pool.query<{
      active_subscriptions: number;
      mrr_cents: number;
      open_requests: number;
      need_offers: number;
      financing_requests: number;
      reviews_due: number;
    }>(
      "with scoped_subs as (" +
        " select s.* from optimization_subscriptions s left join customers c on c.id=s.customer_id " + subScope +
      "), scoped_requests as (" +
        " select r.* from optimization_requests r join optimization_subscriptions s on s.id=r.subscription_id left join customers c on c.id=s.customer_id " + requestScope +
      "), offer_counts as (" +
        " select request_id, count(*) filter (where status in ('draft','sent','accepted','rejected'))::int as cnt from optimization_offers group by request_id" +
      ") select " +
        "count(*) filter (where ss.status='active' and ss.billing_status='active')::int as active_subscriptions," +
        "coalesce(sum(ss.price_cents) filter (where ss.status='active' and ss.billing_status='active'),0)::int as mrr_cents," +
        "(select count(*)::int from scoped_requests where status not in ('done','canceled')) as open_requests," +
        "(select count(*)::int from scoped_requests sr left join offer_counts oc on oc.request_id=sr.id where sr.status in ('market_scan','offers_ready','waiting_customer') and coalesce(oc.cnt,0) < 3) as need_offers," +
        "(select count(*)::int from scoped_requests where financing_wanted=true and status not in ('done','canceled')) as financing_requests," +
        "count(*) filter (where ss.status='active' and ss.next_review_at is not null and ss.next_review_at <= now())::int as reviews_due " +
      "from scoped_subs ss",
      params,
    ),
    pool.query<{
      id: number; public_token: string; customer_name: string; email: string; phone: string | null;
      status: string; billing_status: string; price_cents: number; owner_employee_id: number | null;
      owner_name: string | null; customer_label: string | null; next_review_at: Date | null; created_at: Date;
      request_count: number; open_request_count: number;
    }>(
      "select s.id,s.public_token,s.customer_name,s.email,s.phone,s.status,s.billing_status,s.price_cents,s.owner_employee_id," +
      " e.name as owner_name," + customerLabelSql("c") + " as customer_label,s.next_review_at,s.created_at," +
      " count(r.id)::int as request_count,count(r.id) filter (where r.status not in ('done','canceled'))::int as open_request_count" +
      " from optimization_subscriptions s left join customers c on c.id=s.customer_id left join employees e on e.id=s.owner_employee_id" +
      " left join optimization_requests r on r.subscription_id=s.id " + subScope +
      " group by s.id,e.name,c.company_name,c.first_name,c.last_name,c.customer_number" +
      " order by case when s.status='active' then 0 when s.status='onboarding' then 1 else 2 end,s.updated_at desc limit 150",
      params,
    ),
    pool.query<{
      id: number; subscription_id: number; customer_name: string; request_type: string; status: string; priority: string;
      title: string; description: string; financing_wanted: boolean; assigned_employee_id: number | null; assignee_name: string | null;
      created_at: Date; updated_at: Date; offer_count: number; sent_offer_count: number;
    }>(
      "select r.id,r.subscription_id,s.customer_name,r.request_type,r.status,r.priority,r.title,r.description,r.financing_wanted," +
      " r.assigned_employee_id,e.name as assignee_name,r.created_at,r.updated_at," +
      " count(o.id)::int as offer_count,count(o.id) filter (where o.status in ('sent','accepted','rejected'))::int as sent_offer_count" +
      " from optimization_requests r join optimization_subscriptions s on s.id=r.subscription_id" +
      " left join customers c on c.id=s.customer_id left join employees e on e.id=r.assigned_employee_id" +
      " left join optimization_offers o on o.request_id=r.id " + requestScope +
      " group by r.id,s.customer_name,e.name order by" +
      " case r.priority when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,r.updated_at desc limit 200",
      params,
    ),
    admin
      ? pool.query<{ id: number; name: string }>("select id,name from employees where active=true order by name asc")
      : Promise.resolve({ rows: [{ id: user.id, name: user.name }] } as { rows: Array<{ id: number; name: string }> }),
  ]);

  return {
    stats: statsResult.rows[0] ?? {
      active_subscriptions: 0, mrr_cents: 0, open_requests: 0, need_offers: 0, financing_requests: 0, reviews_due: 0,
    },
    subscriptions: subscriptionsResult.rows,
    requests: requestsResult.rows,
    employees: employeesResult.rows,
    isAdmin: admin,
  };
}

export async function getOptimizationAccess(user: SessionUser, requestId: number) {
  const result = await pool.query<{
    request_id: number; subscription_id: number; owner_employee_id: number | null; assigned_employee_id: number | null;
    customer_owner_employee_id: number | null;
  }>(
    "select r.id as request_id,r.subscription_id,s.owner_employee_id,r.assigned_employee_id,c.owner_employee_id as customer_owner_employee_id" +
    " from optimization_requests r join optimization_subscriptions s on s.id=r.subscription_id left join customers c on c.id=s.customer_id" +
    " where r.id=$1 limit 1",
    [requestId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const allowed = user.role === "admin"
    || row.owner_employee_id === user.id
    || row.assigned_employee_id === user.id
    || row.customer_owner_employee_id === user.id;
  return allowed ? row : null;
}

export async function getOptimizationSubscriptionAccess(user: SessionUser, subscriptionId: number) {
  const result = await pool.query<{
    id: number; owner_employee_id: number | null; customer_owner_employee_id: number | null;
  }>(
    "select s.id,s.owner_employee_id,c.owner_employee_id as customer_owner_employee_id" +
    " from optimization_subscriptions s left join customers c on c.id=s.customer_id where s.id=$1 limit 1",
    [subscriptionId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const allowed = user.role === "admin" || row.owner_employee_id === user.id || row.customer_owner_employee_id === user.id;
  return allowed ? row : null;
}

export async function getOptimizationCustomerApp(publicToken: string) {
  const subscriptionResult = await pool.query<{
    id: number; public_token: string; customer_name: string; email: string; phone: string | null; status: string;
    billing_status: string; price_cents: number; next_review_at: Date | null; started_at: Date | null; created_at: Date;
  }>(
    "select id,public_token,customer_name,email,phone,status,billing_status,price_cents,next_review_at,started_at,created_at" +
    " from optimization_subscriptions where public_token=$1 limit 1",
    [publicToken],
  );
  const subscription = subscriptionResult.rows[0];
  if (!subscription) return null;

  const [requestResult, documentResult] = await Promise.all([
    pool.query<{
      id: number; request_type: string; status: string; priority: string; title: string; description: string;
      financing_wanted: boolean; target_date: string | null; created_at: Date; updated_at: Date;
      offers: Array<{
        id: number; rank: number; title: string; monthly_cents: number | null; one_time_cents: number | null;
        estimated_savings_cents: number | null; term_months: number | null; highlights: string[]; limitations: string; status: string;
      }>;
    }>(
      "select r.id,r.request_type,r.status,r.priority,r.title,r.description,r.financing_wanted,r.target_date,r.created_at,r.updated_at," +
      " coalesce(json_agg(json_build_object(" +
      " 'id',o.id,'rank',o.rank,'title',o.title,'monthly_cents',o.monthly_cents,'one_time_cents',o.one_time_cents," +
      " 'estimated_savings_cents',o.estimated_savings_cents,'term_months',o.term_months,'highlights',o.highlights,'limitations',o.limitations,'status',o.status" +
      ") order by o.rank) filter (where o.id is not null and o.status in ('sent','accepted','rejected')),'[]'::json) as offers" +
      " from optimization_requests r left join optimization_offers o on o.request_id=r.id where r.subscription_id=$1" +
      " group by r.id order by r.updated_at desc",
      [subscription.id],
    ),
    pool.query<{ id: number; request_id: number | null; category: string; filename: string; content_type: string; size_bytes: number; created_at: Date }>(
      "select id,request_id,category,filename,content_type,size_bytes,created_at from optimization_documents where subscription_id=$1 order by created_at desc limit 100",
      [subscription.id],
    ),
  ]);

  return { subscription, requests: requestResult.rows, documents: documentResult.rows };
}

export async function writeOptimizationEvent(input: {
  subscriptionId: number;
  requestId?: number | null;
  actorEmployeeId?: number | null;
  actorType: "customer" | "employee" | "system" | "billing";
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  await pool.query(
    "insert into optimization_events(subscription_id,request_id,actor_employee_id,actor_type,event_type,payload)" +
    " values($1,$2,$3,$4,$5,$6::jsonb)",
    [
      input.subscriptionId,
      input.requestId ?? null,
      input.actorEmployeeId ?? null,
      input.actorType,
      input.eventType,
      JSON.stringify(input.payload ?? {}),
    ],
  );
}
