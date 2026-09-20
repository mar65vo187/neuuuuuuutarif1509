ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS created_by_employee_id integer REFERENCES employees(id) ON DELETE SET NULL;

UPDATE leads
SET created_by_employee_id = assigned_employee_id
WHERE created_by_employee_id IS NULL
  AND source = 'portal'
  AND assigned_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_created_by_employee_idx
  ON leads(created_by_employee_id, created_at DESC);
