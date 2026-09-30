-- Gewerbeerlaubnisse der Berater (§§ 34c, 34d, 34f, 34i GewO) für die
-- Erstinformation. Berater arbeiten als selbstständige Handelsvertreter und
-- führen ihre Erlaubnis und Registrierung jeweils selbst.
CREATE TABLE IF NOT EXISTS advisor_licenses (
  id serial PRIMARY KEY,
  advisor_id integer NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('34c', '34d', '34f', '34i')),
  status text NOT NULL CHECK (length(trim(status)) BETWEEN 5 AND 200),
  holder_name text NOT NULL CHECK (length(trim(holder_name)) BETWEEN 2 AND 160),
  business_address text NOT NULL CHECK (length(trim(business_address)) BETWEEN 5 AND 300),
  register_number text CHECK (register_number IS NULL OR length(trim(register_number)) BETWEEN 4 AND 60),
  authority text NOT NULL CHECK (length(trim(authority)) BETWEEN 3 AND 300),
  remuneration text NOT NULL DEFAULT '' CHECK (length(remuneration) <= 500),
  no_holdings_confirmed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Für § 34d, § 34f und § 34i besteht eine Registrierungspflicht, für § 34c nicht.
  CONSTRAINT advisor_licenses_register_required CHECK (kind = '34c' OR register_number IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS advisor_licenses_advisor_idx ON advisor_licenses(advisor_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS advisor_licenses_active_kind_unique
  ON advisor_licenses(advisor_id, kind) WHERE active;
