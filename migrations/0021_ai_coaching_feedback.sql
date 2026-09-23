-- Store only structured coaching feedback. Never persist prompts, customer data or generated answers.
CREATE TABLE IF NOT EXISTS ai_assistant_feedback (
  id serial PRIMARY KEY,
  usage_id integer NOT NULL UNIQUE REFERENCES ai_assistant_usage(id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  helpful boolean NOT NULL,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_assistant_feedback_outcome_check CHECK (outcome IN ('next_step','more_information','not_a_fit','not_applied'))
);

CREATE INDEX IF NOT EXISTS ai_assistant_feedback_loop_idx ON ai_assistant_feedback(created_at DESC, outcome);
