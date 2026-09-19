CREATE TABLE IF NOT EXISTS loyalty_bonus_ledger (
  id serial PRIMARY KEY NOT NULL,
  employee_id integer NOT NULL,
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  note text DEFAULT '' NOT NULL,
  created_by_employee_id integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE loyalty_bonus_ledger
    ADD CONSTRAINT loyalty_bonus_ledger_employee_id_fk
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE loyalty_bonus_ledger
    ADD CONSTRAINT loyalty_bonus_ledger_created_by_employee_id_fk
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(id) ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE loyalty_bonus_ledger
    ADD CONSTRAINT loyalty_bonus_ledger_type_check
    CHECK (type IN ('credit','payout','correction_debit'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE loyalty_bonus_ledger
    ADD CONSTRAINT loyalty_bonus_ledger_amount_check
    CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS loyalty_bonus_ledger_employee_idx
  ON loyalty_bonus_ledger (employee_id, created_at DESC);
