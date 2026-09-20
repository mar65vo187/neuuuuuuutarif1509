-- Structured call history and automatic follow-up intelligence for leads.
CREATE TABLE IF NOT EXISTS lead_call_activities (
  id serial PRIMARY KEY,
  lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  called_at timestamptz NOT NULL,
  reached_person text NOT NULL,
  reaction text NOT NULL,
  outcome text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  note text NOT NULL DEFAULT '',
  requested_callback_at timestamptz,
  suggested_follow_up_at timestamptz,
  suggestion_reason text NOT NULL DEFAULT '',
  recommended_action text NOT NULL DEFAULT 'call_again',
  auto_scheduled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_call_activities_lead_idx
  ON lead_call_activities(lead_id, called_at DESC);

CREATE INDEX IF NOT EXISTS lead_call_activities_employee_idx
  ON lead_call_activities(employee_id, called_at DESC);

CREATE INDEX IF NOT EXISTS lead_call_activities_follow_up_idx
  ON lead_call_activities(suggested_follow_up_at)
  WHERE suggested_follow_up_at IS NOT NULL;
