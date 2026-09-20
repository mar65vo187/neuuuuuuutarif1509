-- Fast internal identity search and duplicate prevention support.
-- Name matches remain advisory; strong duplicate blocking uses exact normalized e-mail/phone.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS leads_name_trgm_idx
  ON leads USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS leads_email_trgm_idx
  ON leads USING gin (lower(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS leads_phone_normalized_idx
  ON leads ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));

CREATE INDEX IF NOT EXISTS customers_company_trgm_idx
  ON customers USING gin (lower(coalesce(company_name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_name_trgm_idx
  ON customers USING gin (lower(trim(concat_ws(' ', coalesce(first_name, ''), coalesce(last_name, '')))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_email_trgm_idx
  ON customers USING gin (lower(coalesce(email, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_phone_normalized_idx
  ON customers ((regexp_replace(coalesce(phone, ''), '\D', '', 'g')));
