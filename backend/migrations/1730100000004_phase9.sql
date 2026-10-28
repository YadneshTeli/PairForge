-- Up Migration

ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN github_login TEXT;
ALTER TABLE profiles ADD COLUMN github_languages JSONB NOT NULL DEFAULT '[]';

CREATE TABLE pair_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  document TEXT NOT NULL DEFAULT '',
  revision INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE premium_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Down Migration

DROP TABLE IF EXISTS premium_requests;
DROP TABLE IF EXISTS pair_sessions;
ALTER TABLE profiles DROP COLUMN IF EXISTS github_languages;
ALTER TABLE profiles DROP COLUMN IF EXISTS github_login;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_premium;
