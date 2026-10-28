-- Up Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE user_role AS ENUM ('founder', 'cofounder', 'vc', 'developer', 'freelancer', 'student');
CREATE TYPE project_stage AS ENUM ('idea', 'prototype', 'mvp', 'launched');
CREATE TYPE swipe_action AS ENUM ('pass', 'like', 'superlike');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE match_kind AS ENUM ('project', 'people');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role user_role,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  experience_level TEXT CHECK (experience_level IS NULL OR experience_level IN ('junior', 'mid', 'senior', 'lead')),
  availability TEXT NOT NULL DEFAULT 'open',
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rating_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role, key)
);
CREATE INDEX idx_rating_criteria_role_active ON rating_criteria (role, active);

CREATE TABLE role_weights (
  role user_role PRIMARY KEY,
  weight NUMERIC NOT NULL DEFAULT 1.0 CHECK (weight > 0)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  stage project_stage NOT NULL,
  looking_for TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_projects_owner ON projects (owner_id);

CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  swiper_id UUID NOT NULL REFERENCES profiles(id),
  action swipe_action NOT NULL,
  ratings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, swiper_id)
);
CREATE INDEX idx_swipes_project ON swipes (project_id);

CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (project_id, requester_id)
);
CREATE INDEX idx_match_requests_project_status ON match_requests (project_id, status);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind match_kind NOT NULL DEFAULT 'project',
  project_id UUID REFERENCES projects(id),
  user_a_id UUID NOT NULL REFERENCES profiles(id),
  user_b_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_shape CHECK (
    (kind = 'project' AND project_id IS NOT NULL)
    OR (kind = 'people' AND project_id IS NULL)
  )
);
CREATE UNIQUE INDEX idx_matches_project_requester ON matches (project_id, user_a_id) WHERE kind = 'project';
CREATE UNIQUE INDEX idx_matches_people_pair ON matches (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id)) WHERE kind = 'people';
CREATE INDEX idx_matches_user_a ON matches (user_a_id);
CREATE INDEX idx_matches_user_b ON matches (user_b_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_messages_match_created ON messages (match_id, created_at);

INSERT INTO role_weights (role, weight) VALUES
  ('vc', 1.5),
  ('founder', 1.2),
  ('cofounder', 1.2),
  ('developer', 1.1),
  ('freelancer', 1.0),
  ('student', 0.8);

INSERT INTO rating_criteria (role, key, label, sort_order) VALUES
  ('vc', 'market_size', 'Market Size', 0),
  ('vc', 'monetization', 'Monetization Path', 1),
  ('vc', 'investability', 'Investability', 2),
  ('developer', 'feasibility', 'Technical Feasibility', 0),
  ('developer', 'scope_clarity', 'Stack/Scope Clarity', 1),
  ('developer', 'would_build', 'Would I Build This', 2),
  ('freelancer', 'clarity', 'Project Clarity', 0),
  ('freelancer', 'fair_scope', 'Fair Scope for Engagement', 1),
  ('freelancer', 'would_take', 'Would I Take This On', 2),
  ('student', 'learning', 'Learning Value', 0),
  ('student', 'interest', 'Personal Interest', 1),
  ('student', 'approachable', 'Approachable for a Student', 2),
  ('founder', 'originality', 'Idea Originality', 0),
  ('founder', 'founder_fit', 'Founder-Market Fit', 1),
  ('founder', 'would_cofound', 'Would I Cofound', 2),
  ('cofounder', 'originality', 'Idea Originality', 0),
  ('cofounder', 'founder_fit', 'Founder-Market Fit', 1),
  ('cofounder', 'would_cofound', 'Would I Cofound', 2);

-- Down Migration

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS match_requests;
DROP TABLE IF EXISTS swipes;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS role_weights;
DROP TABLE IF EXISTS rating_criteria;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS match_kind;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS swipe_action;
DROP TYPE IF EXISTS project_stage;
DROP TYPE IF EXISTS user_role;
