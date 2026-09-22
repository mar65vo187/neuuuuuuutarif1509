CREATE TABLE IF NOT EXISTS operations_policy (
  policy_key text PRIMARY KEY DEFAULT 'default',
  lead_next_action_missing_hours integer NOT NULL DEFAULT 24,
  lead_next_action_high_hours integer NOT NULL DEFAULT 72,
  customer_review_high_days integer NOT NULL DEFAULT 14,
  opportunity_review_high_days integer NOT NULL DEFAULT 14,
  order_stale_days integer NOT NULL DEFAULT 7,
  provider_reference_missing_hours integer NOT NULL DEFAULT 24,
  provider_status_missing_hours integer NOT NULL DEFAULT 48,
  activation_stale_days integer NOT NULL DEFAULT 7,
  documents_stale_hours integer NOT NULL DEFAULT 48,
  updated_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operations_policy_singleton_check CHECK (policy_key = 'default'),
  CONSTRAINT operations_policy_lead_missing_check CHECK (lead_next_action_missing_hours BETWEEN 1 AND 720),
  CONSTRAINT operations_policy_lead_high_check CHECK (lead_next_action_high_hours BETWEEN 1 AND 2160),
  CONSTRAINT operations_policy_lead_order_check CHECK (lead_next_action_high_hours >= lead_next_action_missing_hours),
  CONSTRAINT operations_policy_customer_review_check CHECK (customer_review_high_days BETWEEN 1 AND 365),
  CONSTRAINT operations_policy_opportunity_review_check CHECK (opportunity_review_high_days BETWEEN 1 AND 365),
  CONSTRAINT operations_policy_order_stale_check CHECK (order_stale_days BETWEEN 1 AND 90),
  CONSTRAINT operations_policy_provider_reference_check CHECK (provider_reference_missing_hours BETWEEN 1 AND 720),
  CONSTRAINT operations_policy_provider_status_check CHECK (provider_status_missing_hours BETWEEN 1 AND 720),
  CONSTRAINT operations_policy_activation_stale_check CHECK (activation_stale_days BETWEEN 1 AND 90),
  CONSTRAINT operations_policy_documents_stale_check CHECK (documents_stale_hours BETWEEN 1 AND 720)
);

INSERT INTO operations_policy (
  policy_key,
  lead_next_action_missing_hours,
  lead_next_action_high_hours,
  customer_review_high_days,
  opportunity_review_high_days,
  order_stale_days,
  provider_reference_missing_hours,
  provider_status_missing_hours,
  activation_stale_days,
  documents_stale_hours
) VALUES ('default', 24, 72, 14, 14, 7, 24, 48, 7, 48)
ON CONFLICT (policy_key) DO NOTHING;
