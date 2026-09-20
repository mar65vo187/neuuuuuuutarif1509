ALTER TABLE referrers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_key text NOT NULL DEFAULT 'rocket',
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrers_avatar_key_check'
  ) THEN
    ALTER TABLE referrers
      ADD CONSTRAINT referrers_avatar_key_check
      CHECK (avatar_key IN ('rocket','bolt','star','compass','crown','spark'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS referrers_leaderboard_idx
  ON referrers(leaderboard_opt_in, active)
  WHERE leaderboard_opt_in = true;
