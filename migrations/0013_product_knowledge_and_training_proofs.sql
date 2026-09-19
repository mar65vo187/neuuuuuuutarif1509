ALTER TABLE product_catalog_profiles
  ADD COLUMN IF NOT EXISTS short_pitch text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_pitch text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS d2d_pitch text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS b2b_pitch text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_template text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_template text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_ideas jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS product_update_reads (
  update_id integer NOT NULL REFERENCES product_updates(id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, employee_id)
);
CREATE INDEX IF NOT EXISTS product_update_reads_employee_idx
  ON product_update_reads(employee_id, read_at DESC);

ALTER TABLE employee_training_completions
  ADD COLUMN IF NOT EXISTS certificate_code text;

UPDATE employee_training_completions
SET certificate_code = 'TW-' || module_id::text || '-' || employee_id::text || '-' || id::text
WHERE status = 'completed' AND certificate_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employee_training_certificate_code_unique
  ON employee_training_completions(certificate_code)
  WHERE certificate_code IS NOT NULL;
