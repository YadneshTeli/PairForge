import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../config';
import { one, query } from '../db';
import { HttpError, isUniqueViolation } from '../errors';
import { asyncHandler, requireAuth, validateBody } from '../middleware';
import { fetchGithubLanguages } from './github';

export interface SkillRow {
  id: string;
  name: string;
  category: string | null;
  proficiency: number;
}

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  experience_level: string | null;
  availability: string;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  interests: string[];
  connection_intent: string | null;
  visibility: string;
  latitude: number | null;
  longitude: number | null;
  is_premium?: boolean;
  github_login?: string | null;
  github_languages?: Array<{ name: string; repos: number }>;
  created_at: Date;
}

const PROFILE_COLUMNS = `
  id, user_id, display_name, role, bio, avatar_url, location, experience_level,
  availability, github_url, linkedin_url, portfolio_url, interests, connection_intent,
  visibility, latitude, longitude, is_premium, github_login, github_languages, created_at
`;

export async function loadSkills(profileIds: string[]): Promise<Map<string, SkillRow[]>> {
  const map = new Map<string, SkillRow[]>();
  if (profileIds.length === 0) return map;
  const rows = await query<{
    profile_id: string;
    id: string;
    name: string;
    category: string | null;
    proficiency_level: number;
  }>(
    `SELECT us.profile_id, s.id, s.name, s.category, us.proficiency_level
     FROM user_skills us
     JOIN skills s ON s.id = us.skill_id
     WHERE us.profile_id = ANY($1::uuid[])
     ORDER BY s.name`,
    [profileIds],
  );
  for (const row of rows) {
    const list = map.get(row.profile_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      category: row.category,
      proficiency: row.proficiency_level,
    });
    map.set(row.profile_id, list);
  }
  return map;
}

export function mapProfile(row: ProfileRow, skills: SkillRow[] = []) {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    location: row.location,
    experienceLevel: row.experience_level,
    availability: row.availability,
    githubUrl: row.github_url,
    linkedinUrl: row.linkedin_url,
    portfolioUrl: row.portfolio_url,
    interests: row.interests ?? [],
    connectionIntent: row.connection_intent,
    visibility: row.visibility,
    latitude: row.latitude,
    longitude: row.longitude,
    isPremium: row.is_premium === true,
    githubLogin: row.github_login ?? null,
    githubLanguages: row.github_languages ?? [],
    skills,
    createdAt: row.created_at,
  };
}

export type PublicProfile = ReturnType<typeof mapProfile>;

export function redactProfile(profile: PublicProfile, viewerId: string): PublicProfile {
  if (profile.id === viewerId || profile.visibility === 'public') return profile;
  if (profile.visibility === 'anonymous') {
    return {
      ...profile,
      displayName: 'Anonymous',
      bio: null,
      avatarUrl: null,
      location: null,
      githubUrl: null,
      githubLogin: null,
      githubLanguages: [],
      linkedinUrl: null,
      portfolioUrl: null,
      latitude: null,
      longitude: null,
    };
  }
  return {
    ...profile,
    githubUrl: null,
    githubLogin: null,
    githubLanguages: [],
    linkedinUrl: null,
    portfolioUrl: null,
    latitude: null,
    longitude: null,
  };
}

export async function getProfile(profileId: string): Promise<ProfileRow | null> {
  return one<ProfileRow>(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = $1`, [profileId]);
}

export async function presentProfile(profileId: string, viewerId: string) {
  const row = await getProfile(profileId);
  if (!row) return null;
  const skills = await loadSkills([profileId]);
  return redactProfile(mapProfile(row, skills.get(profileId) ?? []), viewerId);
}

const roleSchema = z.object({
  role: z.enum(ROLES),
});

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']).nullable().optional(),
  availability: z.string().trim().max(20).optional(),
  githubUrl: z.string().trim().url().nullable().optional(),
  linkedinUrl: z.string().trim().url().nullable().optional(),
  portfolioUrl: z.string().trim().url().nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  connectionIntent: z.enum(['dating', 'networking', 'collab']).nullable().optional(),
  visibility: z.enum(['public', 'semi_private', 'anonymous']).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

const skillsSchema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        proficiency: z.number().int().min(1).max(5),
      }),
    )
    .max(20),
});

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.patch(
  '/role',
  validateBody(roleSchema),
  asyncHandler(async (req, res) => {
    const current = await one<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1', [
      req.user!.profileId,
    ]);
    if (!current) throw new HttpError(404, 'Profile not found');
    if (current.role) throw new HttpError(409, 'Role is already set');
    const updated = await one<ProfileRow>(
      `UPDATE profiles SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING ${PROFILE_COLUMNS}`,
      [req.user!.profileId, req.body.role],
    );
    const skills = await loadSkills([req.user!.profileId]);
    res.json({ profile: mapProfile(updated!, skills.get(req.user!.profileId) ?? []) });
  }),
);

profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await presentProfile(req.user!.profileId, req.user!.profileId);
    if (!profile) throw new HttpError(404, 'Profile not found');
    res.json({ profile });
  }),
);

profileRouter.put(
  '/',
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const sets: string[] = [];
    const params: unknown[] = [req.user!.profileId];
    const mapping: Array<[keyof typeof body, string]> = [
      ['displayName', 'display_name'],
      ['bio', 'bio'],
      ['avatarUrl', 'avatar_url'],
      ['location', 'location'],
      ['experienceLevel', 'experience_level'],
      ['availability', 'availability'],
      ['githubUrl', 'github_url'],
      ['linkedinUrl', 'linkedin_url'],
      ['portfolioUrl', 'portfolio_url'],
      ['interests', 'interests'],
      ['connectionIntent', 'connection_intent'],
      ['visibility', 'visibility'],
      ['latitude', 'latitude'],
      ['longitude', 'longitude'],
    ];
    for (const [key, column] of mapping) {
      if (body[key] !== undefined) {
        params.push(body[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw new HttpError(400, 'No fields to update');
    sets.push('updated_at = NOW()');
    const updated = await one<ProfileRow>(
      `UPDATE profiles SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PROFILE_COLUMNS}`,
      params,
    );
    const skills = await loadSkills([req.user!.profileId]);
    res.json({ profile: mapProfile(updated!, skills.get(req.user!.profileId) ?? []) });
  }),
);

profileRouter.put(
  '/skills',
  validateBody(skillsSchema),
  asyncHandler(async (req, res) => {
    const profileId = req.user!.profileId;
    const skills = req.body.skills as Array<{ name: string; proficiency: number }>;
    const seen = new Set<string>();
    try {
      await query('DELETE FROM user_skills WHERE profile_id = $1', [profileId]);
      for (const skill of skills) {
        const name = skill.name.toLowerCase();
        if (seen.has(name)) continue;
        seen.add(name);
        await query(
          `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [name],
        );
        await query(
          `INSERT INTO user_skills (profile_id, skill_id, proficiency_level)
           SELECT $1, id, $3 FROM skills WHERE name = $2`,
          [profileId, name, skill.proficiency],
        );
      }
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'Duplicate skill');
      throw err;
    }
    const profile = await presentProfile(profileId, profileId);
    res.json({ profile });
  }),
);

const githubSchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9-]{1,39}$/, 'Enter a GitHub username'),
});

profileRouter.post(
  '/github',
  validateBody(githubSchema),
  asyncHandler(async (req, res) => {
    const username = (req.body as z.infer<typeof githubSchema>).username;
    let languages;
    try {
      languages = await fetchGithubLanguages(username);
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 502;
      throw new HttpError(status === 404 ? 404 : 502, err instanceof Error ? err.message : 'GitHub is unavailable');
    }
    const updated = await one<ProfileRow>(
      `UPDATE profiles
       SET github_login = $2, github_url = $3, github_languages = $4::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING ${PROFILE_COLUMNS}`,
      [req.user!.profileId, username, `https://github.com/${username}`, JSON.stringify(languages)],
    );
    const skills = await loadSkills([req.user!.profileId]);
    res.json({ profile: mapProfile(updated!, skills.get(req.user!.profileId) ?? []) });
  }),
);

const premiumRequestSchema = z.object({
  note: z.string().trim().max(500).default(''),
});

profileRouter.post(
  '/premium-request',
  validateBody(premiumRequestSchema),
  asyncHandler(async (req, res) => {
    const row = await one<{ id: string }>(
      `INSERT INTO premium_requests (profile_id, note) VALUES ($1, $2) RETURNING id`,
      [req.user!.profileId, (req.body as z.infer<typeof premiumRequestSchema>).note],
    );
    res.status(201).json({ request: { id: row!.id } });
  }),
);

export const profilesRouter = Router();
profilesRouter.use(requireAuth);
profilesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await presentProfile(req.params.id, req.user!.profileId);
    if (!profile) throw new HttpError(404, 'Profile not found');
    res.json({ profile });
  }),
);
