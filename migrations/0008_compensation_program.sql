CREATE TABLE IF NOT EXISTS employee_compensation_profiles (
  employee_id integer PRIMARY KEY NOT NULL,
  payout_percent numeric(5,2) DEFAULT '82.00' NOT NULL,
  reserve_percent numeric(5,2) DEFAULT '8.00' NOT NULL,
  savings_percent numeric(5,2) DEFAULT '0.00' NOT NULL,
  loyalty_started_at timestamp with time zone DEFAULT now() NOT NULL,
  loyalty_vesting_years integer DEFAULT 10 NOT NULL,
  team_level text DEFAULT 'berater' NOT NULL,
  note text DEFAULT '' NOT NULL,
  updated_by_employee_id integer,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_profiles_employee_id_fk
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_profiles_updated_by_employee_id_fk
    FOREIGN KEY (updated_by_employee_id) REFERENCES employees(id) ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_payout_tier_check
    CHECK (payout_percent IN (82.00,84.00,86.00,88.00,90.00,92.00));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_reserve_check
    CHECK (reserve_percent >= 0 AND reserve_percent <= 20);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_savings_check
    CHECK (savings_percent >= 0 AND savings_percent <= 20);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_vesting_check
    CHECK (loyalty_vesting_years >= 1 AND loyalty_vesting_years <= 20);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE employee_compensation_profiles
    ADD CONSTRAINT employee_compensation_team_level_check
    CHECK (team_level IN ('berater','senior','builder','teamlead'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS employee_compensation_updated_idx
  ON employee_compensation_profiles (updated_at DESC);

CREATE TABLE IF NOT EXISTS compensation_history (
  id serial PRIMARY KEY NOT NULL,
  employee_id integer NOT NULL,
  changed_by_employee_id integer,
  old_values jsonb,
  new_values jsonb NOT NULL,
  reason text DEFAULT '' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE compensation_history
    ADD CONSTRAINT compensation_history_employee_id_fk
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE compensation_history
    ADD CONSTRAINT compensation_history_changed_by_employee_id_fk
    FOREIGN KEY (changed_by_employee_id) REFERENCES employees(id) ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS compensation_history_employee_idx
  ON compensation_history (employee_id, created_at DESC);

INSERT INTO employee_compensation_profiles (employee_id)
SELECT id FROM employees
ON CONFLICT (employee_id) DO NOTHING;
