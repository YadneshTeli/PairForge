-- Up Migration

ALTER TABLE profiles ADD COLUMN interests TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN connection_intent TEXT;
ALTER TABLE profiles ADD CONSTRAINT profiles_intent_check CHECK (
  connection_intent IS NULL OR connection_intent IN ('dating', 'networking', 'collab')
);
ALTER TABLE profiles ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE profiles ADD CONSTRAINT profiles_visibility_check CHECK (
  visibility IN ('public', 'semi_private', 'anonymous')
);
ALTER TABLE profiles ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN longitude DOUBLE PRECISION;

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE TABLE user_skills (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level INT NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5),
  PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE user_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('pass', 'like')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
CREATE INDEX idx_user_swipes_target_action ON user_swipes (target_id, action);

INSERT INTO skills (name, category) VALUES
  ('typescript', 'language'),
  ('javascript', 'language'),
  ('python', 'language'),
  ('go', 'language'),
  ('rust', 'language'),
  ('java', 'language'),
  ('flutter', 'framework'),
  ('react', 'framework'),
  ('node', 'platform'),
  ('postgres', 'data')
ON CONFLICT (name) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS user_swipes;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_visibility_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_intent_check;
ALTER TABLE profiles DROP COLUMN IF EXISTS longitude;
ALTER TABLE profiles DROP COLUMN IF EXISTS latitude;
ALTER TABLE profiles DROP COLUMN IF EXISTS visibility;
ALTER TABLE profiles DROP COLUMN IF EXISTS connection_intent;
ALTER TABLE profiles DROP COLUMN IF EXISTS interests;
