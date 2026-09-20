-- Privacy-conscious usage telemetry for the internal TarifWerk AI assistant.
-- Prompt and response contents are intentionally NOT stored.

CREATE TABLE IF NOT EXISTS ai_assistant_usage (
  id serial PRIMARY KEY,
  employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  mode text NOT NULL,
  input_chars integer NOT NULL DEFAULT 0,
  output_chars integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_assistant_usage_status_check CHECK (status IN ('completed','failed','blocked')),
  CONSTRAINT ai_assistant_usage_size_check CHECK (input_chars >= 0 AND output_chars >= 0)
);

CREATE INDEX IF NOT EXISTS ai_assistant_usage_employee_day_idx
  ON ai_assistant_usage(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_assistant_usage_provider_idx
  ON ai_assistant_usage(provider, model, created_at DESC);
