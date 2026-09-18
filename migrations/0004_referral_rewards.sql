CREATE TABLE IF NOT EXISTS referral_rewards (
  id serial PRIMARY KEY,
  referral_id integer NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referrer_id integer NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  order_id integer REFERENCES orders(id) ON DELETE SET NULL,
  rule_key text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  max_voucher_amount_cents integer NOT NULL,
  voucher_amount_cents integer,
  cash_amount_cents integer,
  payout_choice text,
  approved_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_referral_unique ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS referral_rewards_referrer_idx ON referral_rewards(referrer_id, status);
CREATE INDEX IF NOT EXISTS referral_rewards_order_idx ON referral_rewards(order_id);

CREATE TABLE IF NOT EXISTS referral_reward_events (
  id serial PRIMARY KEY,
  reward_id integer NOT NULL REFERENCES referral_rewards(id) ON DELETE CASCADE,
  actor_employee_id integer REFERENCES employees(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text,
  voucher_amount_cents integer,
  cash_amount_cents integer,
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_reward_events_reward_idx ON referral_reward_events(reward_id, created_at DESC);
