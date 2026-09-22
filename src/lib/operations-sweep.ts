import { pool } from "@/db";
import { getOperationsPolicy } from "@/lib/operations-policy";

export type OperationsSweepResult = {
  skipped: boolean;
  leads: number;
  customerReviews: number;
  staleOrders: number;
  opportunities: number;
  atRiskCustomers: number;
  serviceEscalations: number;
};

export async function runOperationsSweep(): Promise<OperationsSweepResult> {
  const operationsPolicy = await getOperationsPolicy();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_xact_lock(772020260920) as locked");
    if (!lock.rows[0]?.locked) {
      await client.query("ROLLBACK");
      return { skipped: true, leads: 0, customerReviews: 0, staleOrders: 0, opportunities: 0, atRiskCustomers: 0, serviceEscalations: 0 };
    }

    const leads = await client.query<{ id: number }>(`
      INSERT INTO tasks (
        entity_type, entity_id, assigned_to_employee_id, created_by_employee_id,
        type, title, description, priority, status, due_at, created_at, updated_at
      )
      SELECT
        'lead', l.id, l.assigned_employee_id, null,
        'lead_next_action_missing',
        'Nächsten Schritt im Lead festlegen',
        'Automatischer Qualitäts-Wächter: Der offene Lead hat seit mindestens ' || $2::int || ' Stunden keinen dokumentierten nächsten Schritt.',
        CASE WHEN l.created_at < now() - $1::int * interval '1 hour' THEN 'high' ELSE 'normal' END,
        'open', now(), now(), now()
      FROM leads l
      WHERE l.assigned_employee_id IS NOT NULL
        AND l.status NOT IN ('termin_bestaetigt','abgeschlossen','verloren')
        AND l.next_action_at IS NULL
        AND l.created_at < now() - $2::int * interval '1 hour'
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.entity_type = 'lead'
            AND t.entity_id = l.id
            AND t.type = 'lead_next_action_missing'
            AND t.status IN ('open','in_progress')
        )
      ORDER BY l.created_at ASC
      LIMIT 500
      RETURNING id
    `, [operationsPolicy.leadNextActionHighHours, operationsPolicy.leadNextActionMissingHours]);

    const reviews = await client.query<{ id: number }>(`
      INSERT INTO tasks (
        entity_type, entity_id, assigned_to_employee_id, created_by_employee_id,
        type, title, description, priority, status, due_at, created_at, updated_at
      )
      SELECT
        'customer', c.id, c.owner_employee_id, null,
        'customer_review_due',
        'Fälligen Bestandscheck durchführen',
        'Automatischer Qualitäts-Wächter: Der in Customer 360 geplante Bestandscheck ist fällig.',
        CASE WHEN ccp.next_review_at < now() - $1::int * interval '1 day' THEN 'high' ELSE 'normal' END,
        'open', now(), now(), now()
      FROM customer_crm_profiles ccp
      INNER JOIN customers c ON c.id = ccp.customer_id
      WHERE c.owner_employee_id IS NOT NULL
        AND c.archived_at IS NULL
        AND ccp.next_review_at IS NOT NULL
        AND ccp.next_review_at < now()
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.entity_type = 'customer'
            AND t.entity_id = c.id
            AND t.type = 'customer_review_due'
            AND t.status IN ('open','in_progress')
        )
      ORDER BY ccp.next_review_at ASC
      LIMIT 500
      RETURNING id
    `, [operationsPolicy.customerReviewHighDays]);

    const staleOrders = await client.query<{ id: number }>(`
      INSERT INTO tasks (
        entity_type, entity_id, assigned_to_employee_id, created_by_employee_id,
        type, title, description, priority, status, due_at, created_at, updated_at
      )
      SELECT
        'order', o.id, o.advisor_employee_id, null,
        'order_sla_review',
        CASE WHEN o.status = 'documents_missing'
          THEN 'Fehlende Unterlagen im Auftrag prüfen'
          ELSE 'Auftrag ohne Aktualisierung prüfen'
        END,
        CASE WHEN o.status = 'documents_missing'
          THEN 'Automatischer Qualitäts-Wächter: Der Auftrag wartet auf Unterlagen oder ist über die allgemeine Auftrags-SLA hinaus ohne Bewegung.'
          ELSE 'Automatischer Qualitäts-Wächter: Der offene Auftrag wurde seit mehr als ' || $2::int || ' Tagen nicht aktualisiert.'
        END,
        CASE WHEN o.status = 'documents_missing' THEN 'high' ELSE 'normal' END,
        'open', now(), now(), now()
      FROM orders o
      WHERE o.advisor_employee_id IS NOT NULL
        AND o.status NOT IN ('active','rejected','cancelled','storno')
        AND (
          (o.status = 'documents_missing' AND o.updated_at < now() - $1::int * interval '1 hour')
          OR o.updated_at < now() - $2::int * interval '1 day'
        )
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.entity_type = 'order'
            AND t.entity_id = o.id
            AND t.status IN ('open','in_progress')
            AND t.type IN ('documents_follow_up','order_sla_review','activation_follow_up')
        )
      ORDER BY o.updated_at ASC
      LIMIT 500
      RETURNING id
    `, [operationsPolicy.documentsStaleHours, operationsPolicy.orderStaleDays]);

    const opportunities = await client.query<{ id: number }>(`
      WITH due AS (
        SELECT
          c.id AS customer_id,
          c.owner_employee_id,
          min(co.next_review_at) AS due_at,
          count(*)::int AS opportunity_count
        FROM customer_opportunities co
        INNER JOIN customers c ON c.id = co.customer_id
        WHERE c.owner_employee_id IS NOT NULL
          AND c.archived_at IS NULL
          AND co.status IN ('open','qualified','later')
          AND co.next_review_at IS NOT NULL
          AND co.next_review_at < now()
        GROUP BY c.id, c.owner_employee_id
      )
      INSERT INTO tasks (
        entity_type, entity_id, assigned_to_employee_id, created_by_employee_id,
        type, title, description, priority, status, due_at, created_at, updated_at
      )
      SELECT
        'customer', d.customer_id, d.owner_employee_id, null,
        'opportunity_review',
        'Fälliges Kundenpotenzial prüfen',
        'Automatischer Qualitäts-Wächter: ' || d.opportunity_count || ' offene Opportunity/Opportunities haben einen fälligen Prüftermin.',
        CASE WHEN d.due_at < now() - $1::int * interval '1 day' THEN 'high' ELSE 'normal' END,
        'open', now(), now(), now()
      FROM due d
      WHERE NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.entity_type = 'customer'
          AND t.entity_id = d.customer_id
          AND t.type = 'opportunity_review'
          AND t.status IN ('open','in_progress')
      )
      ORDER BY d.due_at ASC
      LIMIT 500
      RETURNING id
    `, [operationsPolicy.opportunityReviewHighDays]);

    const riskCustomers = await client.query<{ id: number }>(`
      INSERT INTO tasks (
        entity_type, entity_id, assigned_to_employee_id, created_by_employee_id,
        type, title, description, priority, status, due_at, created_at, updated_at
      )
      SELECT
        'customer', c.id, c.owner_employee_id, null,
        'customer_risk_review',
        'Markierte Kundenbeziehung prüfen',
        'Automatischer Qualitäts-Wächter: Die Kundenbeziehung ist intern als risikobehaftet markiert.',
        CASE WHEN ccp.risk_level = 'critical' THEN 'critical' ELSE 'high' END,
        'open', now(), now(), now()
      FROM customer_crm_profiles ccp
      INNER JOIN customers c ON c.id = ccp.customer_id
      WHERE c.owner_employee_id IS NOT NULL
        AND c.archived_at IS NULL
        AND (ccp.relationship_status = 'at_risk' OR ccp.risk_level IN ('high','critical'))
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.entity_type = 'customer'
            AND t.entity_id = c.id
            AND t.type = 'customer_risk_review'
            AND t.status IN ('open','in_progress')
        )
      ORDER BY CASE WHEN ccp.risk_level = 'critical' THEN 0 ELSE 1 END, c.updated_at ASC
      LIMIT 500
      RETURNING id
    `);

    const serviceEscalations = await client.query<{ id: number }>(`
      INSERT INTO notification_queue (
        employee_id, channel, category, priority, subject, body,
        entity_type, entity_id, action_url, metadata, status, scheduled_at, created_at
      )
      SELECT
        sc.owner_employee_id,
        'in_app',
        'service',
        CASE WHEN sc.priority = 'critical' THEN 'critical' ELSE 'high' END,
        'Service-SLA überschritten · ' || sc.case_number,
        sc.subject,
        'service_case',
        sc.id::text,
        '/portal/service/' || sc.id::text,
        jsonb_build_object(
          'reason', 'sla_overdue',
          'caseNumber', sc.case_number,
          'dueAt', sc.due_at,
          'priority', sc.priority
        ),
        'pending',
        now(),
        now()
      FROM service_cases sc
      WHERE sc.owner_employee_id IS NOT NULL
        AND sc.status IN ('open','in_progress','waiting_customer','waiting_provider')
        AND sc.due_at < now()
        AND NOT EXISTS (
          SELECT 1 FROM notification_queue nq
          WHERE nq.employee_id = sc.owner_employee_id
            AND nq.category = 'service'
            AND nq.entity_type = 'service_case'
            AND nq.entity_id = sc.id::text
            AND nq.metadata->>'reason' = 'sla_overdue'
            AND nq.created_at >= sc.due_at
        )
      ORDER BY sc.due_at ASC
      LIMIT 500
      RETURNING id
    `);

    const result: OperationsSweepResult = {
      skipped: false,
      leads: leads.rowCount ?? 0,
      customerReviews: reviews.rowCount ?? 0,
      staleOrders: staleOrders.rowCount ?? 0,
      opportunities: opportunities.rowCount ?? 0,
      atRiskCustomers: riskCustomers.rowCount ?? 0,
      serviceEscalations: serviceEscalations.rowCount ?? 0,
    };

    await client.query(
      "insert into audit_events (actor_employee_id, action, entity_type, entity_id, new_values, created_at) values (null, 'operations.sweep', 'system', null, $1::jsonb, now())",
      [JSON.stringify({
        ...result,
        operationsPolicy: {
          leadNextActionMissingHours: operationsPolicy.leadNextActionMissingHours,
          leadNextActionHighHours: operationsPolicy.leadNextActionHighHours,
          customerReviewHighDays: operationsPolicy.customerReviewHighDays,
          opportunityReviewHighDays: operationsPolicy.opportunityReviewHighDays,
          orderStaleDays: operationsPolicy.orderStaleDays,
          providerReferenceMissingHours: operationsPolicy.providerReferenceMissingHours,
          providerStatusMissingHours: operationsPolicy.providerStatusMissingHours,
          activationStaleDays: operationsPolicy.activationStaleDays,
          documentsStaleHours: operationsPolicy.documentsStaleHours,
          serviceCriticalHours: operationsPolicy.serviceCriticalHours,
          serviceHighHours: operationsPolicy.serviceHighHours,
          serviceNormalHours: operationsPolicy.serviceNormalHours,
          serviceLowHours: operationsPolicy.serviceLowHours,
        },
      })],
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
