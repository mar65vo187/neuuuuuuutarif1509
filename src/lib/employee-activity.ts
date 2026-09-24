import { pool } from "@/db";
import type { SessionUser } from "@/lib/auth";

export type EmployeeActivityRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastSeenAt: Date | null;
  lastLoginAt: Date | null;
  lastActionAt: Date | null;
  activeDays7: number;
  contacts7: number;
  leads7: number;
  calls7: number;
  customerActivities7: number;
  tasksCompleted7: number;
  orders7: number;
  orders30: number;
  unreadNotifications: number;
  nudges30: number;
  unacknowledgedNudges: number;
  lastNudgeAt: Date | null;
  lastNudgeAckAt: Date | null;
  activityIndex: number;
  activityBand: "active" | "steady" | "low" | "inactive";
};

function computeActivityIndex(row: Omit<EmployeeActivityRow, "activityIndex" | "activityBand">) {
  const now = Date.now();
  const last = row.lastActionAt?.getTime() ?? 0;
  const ageHours = last ? Math.max(0, (now - last) / 3_600_000) : Number.POSITIVE_INFINITY;
  const recency = ageHours <= 24 ? 25 : ageHours <= 72 ? 15 : ageHours <= 168 ? 5 : 0;
  const activeDays = Math.min(28, row.activeDays7 * 4);
  const leads = Math.min(15, row.leads7 * 3);
  const contacts = Math.min(8, row.contacts7 * 2);
  const contactWork = Math.min(15, (row.calls7 + row.customerActivities7) * 2.5);
  const tasks = Math.min(9, row.tasksCompleted7 * 3);
  const orders = Math.min(8, row.orders7 * 4);
  return Math.round(Math.min(100, recency + activeDays + contacts + leads + contactWork + tasks + orders));
}

function band(index: number, lastActionAt: Date | null): EmployeeActivityRow["activityBand"] {
  if (!lastActionAt || Date.now() - lastActionAt.getTime() > 7 * 86_400_000) return "inactive";
  if (index >= 70) return "active";
  if (index >= 35) return "steady";
  return "low";
}

export async function getEmployeeActivityDashboard(user: SessionUser) {
  if (user.role !== "admin") throw new Error("ADMIN_ONLY");

  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
    last_seen_at: Date | null;
    last_login_at: Date | null;
    last_action_at: Date | null;
    active_days_7: number;
    contacts_7: number;
    leads_7: number;
    calls_7: number;
    customer_activities_7: number;
    tasks_completed_7: number;
    orders_7: number;
    orders_30: number;
    unread_notifications: number;
    nudges_30: number;
    unacknowledged_nudges: number;
    last_nudge_at: Date | null;
    last_nudge_ack_at: Date | null;
  }>(`
    WITH activity AS (
      SELECT created_by_employee_id AS employee_id, created_at AS occurred_at, 'contact'::text AS kind
      FROM prospect_contacts WHERE created_by_employee_id IS NOT NULL
      UNION ALL
      SELECT created_by_employee_id AS employee_id, created_at AS occurred_at, 'lead'::text AS kind
      FROM leads WHERE created_by_employee_id IS NOT NULL
      UNION ALL
      SELECT employee_id, called_at, 'call' FROM lead_call_activities WHERE employee_id IS NOT NULL
      UNION ALL
      SELECT employee_id, occurred_at, 'customer_activity' FROM customer_activities WHERE employee_id IS NOT NULL
      UNION ALL
      SELECT assigned_to_employee_id, completed_at, 'task' FROM tasks
      WHERE assigned_to_employee_id IS NOT NULL AND completed_at IS NOT NULL
      UNION ALL
      SELECT coalesce(advisor_employee_id, created_by_employee_id), created_at, 'order' FROM orders
      WHERE coalesce(advisor_employee_id, created_by_employee_id) IS NOT NULL
      UNION ALL
      SELECT actor_employee_id, created_at, 'service' FROM service_case_events WHERE actor_employee_id IS NOT NULL
      UNION ALL
      SELECT actor_employee_id, created_at, 'audit' FROM audit_events WHERE actor_employee_id IS NOT NULL
    ),
    activity_agg AS (
      SELECT employee_id,
        max(occurred_at) AS last_action_at,
        count(DISTINCT (occurred_at AT TIME ZONE 'Europe/Berlin')::date)
          FILTER (WHERE occurred_at >= now() - interval '7 days')::int AS active_days_7,
        count(*) FILTER (WHERE kind='contact' AND occurred_at >= now() - interval '7 days')::int AS contacts_7,
        count(*) FILTER (WHERE kind='lead' AND occurred_at >= now() - interval '7 days')::int AS leads_7,
        count(*) FILTER (WHERE kind='call' AND occurred_at >= now() - interval '7 days')::int AS calls_7,
        count(*) FILTER (WHERE kind='customer_activity' AND occurred_at >= now() - interval '7 days')::int AS customer_activities_7,
        count(*) FILTER (WHERE kind='task' AND occurred_at >= now() - interval '7 days')::int AS tasks_completed_7,
        count(*) FILTER (WHERE kind='order' AND occurred_at >= now() - interval '7 days')::int AS orders_7
      FROM activity
      GROUP BY employee_id
    ),
    seen AS (
      SELECT employee_id, max(last_seen_at) AS last_seen_at
      FROM portal_sessions
      GROUP BY employee_id
    ),
    logins AS (
      SELECT employee_id, max(created_at) FILTER (WHERE success=true) AS last_login_at
      FROM login_events
      WHERE employee_id IS NOT NULL
      GROUP BY employee_id
    ),
    order_30 AS (
      SELECT coalesce(advisor_employee_id, created_by_employee_id) AS employee_id, count(*)::int AS orders_30
      FROM orders
      WHERE coalesce(advisor_employee_id, created_by_employee_id) IS NOT NULL
        AND created_at >= now() - interval '30 days'
      GROUP BY coalesce(advisor_employee_id, created_by_employee_id)
    ),
    notification_agg AS (
      SELECT employee_id,
        count(*) FILTER (
          WHERE channel='in_app' AND status='pending' AND archived_at IS NULL
            AND scheduled_at <= now() AND (snoozed_until IS NULL OR snoozed_until <= now())
        )::int AS unread_notifications,
        count(*) FILTER (WHERE category='nudge' AND created_at >= now() - interval '30 days')::int AS nudges_30,
        count(*) FILTER (WHERE category='nudge' AND requires_ack=true AND acknowledged_at IS NULL AND archived_at IS NULL)::int AS unacknowledged_nudges,
        max(created_at) FILTER (WHERE category='nudge') AS last_nudge_at,
        max(acknowledged_at) FILTER (WHERE category='nudge') AS last_nudge_ack_at
      FROM notification_queue
      WHERE employee_id IS NOT NULL
      GROUP BY employee_id
    )
    SELECT e.id,e.name,e.email,e.role::text,e.active,
      s.last_seen_at,l.last_login_at,a.last_action_at,
      coalesce(a.active_days_7,0)::int AS active_days_7,
      coalesce(a.contacts_7,0)::int AS contacts_7,
      coalesce(a.leads_7,0)::int AS leads_7,
      coalesce(a.calls_7,0)::int AS calls_7,
      coalesce(a.customer_activities_7,0)::int AS customer_activities_7,
      coalesce(a.tasks_completed_7,0)::int AS tasks_completed_7,
      coalesce(a.orders_7,0)::int AS orders_7,
      coalesce(o.orders_30,0)::int AS orders_30,
      coalesce(n.unread_notifications,0)::int AS unread_notifications,
      coalesce(n.nudges_30,0)::int AS nudges_30,
      coalesce(n.unacknowledged_nudges,0)::int AS unacknowledged_nudges,
      n.last_nudge_at,n.last_nudge_ack_at
    FROM employees e
    LEFT JOIN activity_agg a ON a.employee_id=e.id
    LEFT JOIN seen s ON s.employee_id=e.id
    LEFT JOIN logins l ON l.employee_id=e.id
    LEFT JOIN order_30 o ON o.employee_id=e.id
    LEFT JOIN notification_agg n ON n.employee_id=e.id
    WHERE e.active=true
    ORDER BY e.role DESC, e.name ASC
  `);

  const employees: EmployeeActivityRow[] = result.rows.map((row) => {
    const base = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      active: row.active,
      lastSeenAt: row.last_seen_at,
      lastLoginAt: row.last_login_at,
      lastActionAt: row.last_action_at,
      activeDays7: row.active_days_7,
      contacts7: row.contacts_7,
      leads7: row.leads_7,
      calls7: row.calls_7,
      customerActivities7: row.customer_activities_7,
      tasksCompleted7: row.tasks_completed_7,
      orders7: row.orders_7,
      orders30: row.orders_30,
      unreadNotifications: row.unread_notifications,
      nudges30: row.nudges_30,
      unacknowledgedNudges: row.unacknowledged_nudges,
      lastNudgeAt: row.last_nudge_at,
      lastNudgeAckAt: row.last_nudge_ack_at,
    };
    const activityIndex = computeActivityIndex(base);
    return { ...base, activityIndex, activityBand: band(activityIndex, base.lastActionAt) };
  });

  const team = employees.filter((employee) => employee.role !== "admin");
  return {
    employees,
    stats: {
      teamMembers: team.length,
      activeToday: team.filter((employee) => employee.lastActionAt && Date.now() - employee.lastActionAt.getTime() <= 86_400_000).length,
      needsAttention: team.filter((employee) => employee.activityBand === "low" || employee.activityBand === "inactive").length,
      openNudges: team.reduce((sum, employee) => sum + employee.unacknowledgedNudges, 0),
      actions7: team.reduce((sum, employee) => sum + employee.contacts7 + employee.leads7 + employee.calls7 + employee.customerActivities7 + employee.tasksCompleted7 + employee.orders7, 0),
    },
  };
}
