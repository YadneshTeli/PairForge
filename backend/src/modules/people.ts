import { Router } from 'express';
import { z } from 'zod';
import { SCORE_CACHE_TTL_SECONDS } from '../config';
import { one, query, tx } from '../db';
import { HttpError, isUniqueViolation } from '../errors';
import { asyncHandler, requireAuth, validateBody } from '../middleware';
import { getRedis } from '../redis';
import { fetchAiScore, sendMatchSignal } from './ai';
import {
  combineScore,
  cosineBinary,
  experienceScore,
  jaccard,
  locationScore,
} from './compatibility';
import { notify } from './notifications';
import { getProfile, loadSkills, mapProfile, presentProfile, redactProfile } from './profiles';

const swipeSchema = z.object({
  action: z.enum(['pass', 'like']),
});

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string) {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const separator = raw.indexOf('|');
  if (separator <= 0) return null;
  const createdAt = raw.slice(0, separator);
  const id = raw.slice(separator + 1);
  if (!z.string().uuid().safeParse(id).success || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

async function likedIds(profileId: string): Promise<string[]> {
  const rows = await query<{ target_id: string }>(
    `SELECT target_id FROM user_swipes WHERE swiper_id = $1 AND action = 'like'`,
    [profileId],
  );
  return rows.map((row) => row.target_id);
}

export async function ruleScore(profileA: string, profileB: string) {
  const [a, b] = await Promise.all([getProfile(profileA), getProfile(profileB)]);
  if (!a || !b) throw new HttpError(404, 'Profile not found');
  const skills = await loadSkills([profileA, profileB]);
  const aSkills = (skills.get(profileA) ?? []).map((skill) => skill.name);
  const bSkills = (skills.get(profileB) ?? []).map((skill) => skill.name);
  const [likedA, likedB] = await Promise.all([likedIds(profileA), likedIds(profileB)]);
  const components = {
    tech: jaccard(aSkills, bSkills),
    interests: cosineBinary(a.interests ?? [], b.interests ?? []),
    experience: experienceScore(a.experience_level, b.experience_level),
    location: locationScore(a.latitude, a.longitude, b.latitude, b.longitude),
    collaborative: jaccard(likedA, likedB),
  };
  return { score: combineScore(components), components, source: 'rules' as const };
}

export const peopleRouter = Router();
peopleRouter.use(requireAuth);

peopleRouter.get(
  '/feed',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = typeof req.query.cursor === 'string' ? decodeCursor(req.query.cursor) : null;
    if (req.query.cursor && !cursor) throw new HttpError(400, 'Invalid cursor');
    const params: unknown[] = [req.user!.profileId];
    const filters: string[] = [
      'p.id <> $1',
      `p.visibility = 'public'`,
      `NOT EXISTS (SELECT 1 FROM user_swipes us WHERE us.swiper_id = $1 AND us.target_id = p.id)`,
    ];
    if (typeof req.query.intent === 'string' && req.query.intent) {
      params.push(req.query.intent);
      filters.push(`(p.connection_intent IS NULL OR p.connection_intent = $${params.length})`);
    }
    if (typeof req.query.experience === 'string' && req.query.experience) {
      params.push(req.query.experience);
      filters.push(`p.experience_level = $${params.length}`);
    }
    if (typeof req.query.skill === 'string' && req.query.skill) {
      params.push(req.query.skill.toLowerCase());
      filters.push(
        `EXISTS (
          SELECT 1 FROM user_skills us
          JOIN skills s ON s.id = us.skill_id
          WHERE us.profile_id = p.id AND s.name = $${params.length}
        )`,
      );
    }
    if (cursor) {
      params.push(cursor.createdAt, cursor.id);
      filters.push(`(p.created_at, p.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limit + 1);
    const rows = await query(
      `SELECT p.id, p.user_id, p.display_name, p.role, p.bio, p.avatar_url, p.location,
              p.experience_level, p.availability, p.github_url, p.linkedin_url, p.portfolio_url,
              p.interests, p.connection_intent, p.visibility, p.latitude, p.longitude, p.created_at
       FROM profiles p
       WHERE ${filters.join(' AND ')}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const page = rows.slice(0, limit);
    const skills = await loadSkills(page.map((row) => row.id as string));
    const last = page[page.length - 1];
    res.json({
      people: page.map((row) =>
        redactProfile(mapProfile(row as never, skills.get(row.id as string) ?? []), req.user!.profileId),
      ),
      nextCursor: rows.length > limit && last ? encodeCursor(last.created_at as Date, last.id as string) : null,
    });
  }),
);

peopleRouter.get(
  '/:id/compatibility',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.profileId) throw new HttpError(400, 'Cannot score yourself');
    const target = await getProfile(req.params.id);
    if (!target) throw new HttpError(404, 'Profile not found');
    const pair = [req.user!.profileId, req.params.id].sort().join(':');
    const key = `compat:${pair}`;
    const redis = await getRedis();
    const cached = await redis.get(key);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
    const ruled = await ruleScore(req.user!.profileId, req.params.id);
    const ai = await fetchAiScore(req.user!.profileId, req.params.id);
    const payload =
      ai == null
        ? ruled
        : {
            score: Math.round((ai <= 1 ? ai * 100 : ai) * 10) / 10,
            components: ruled.components,
            source: 'ai' as const,
          };
    await redis.set(key, JSON.stringify(payload), { EX: SCORE_CACHE_TTL_SECONDS });
    res.json(payload);
  }),
);

peopleRouter.post(
  '/:id/swipe',
  validateBody(swipeSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const swiperId = req.user!.profileId;
    const action = (req.body as z.infer<typeof swipeSchema>).action;
    if (targetId === swiperId) throw new HttpError(400, 'Cannot swipe yourself');
    const target = await getProfile(targetId);
    if (!target) throw new HttpError(404, 'Profile not found');

    try {
      const outcome = await tx(async (client) => {
        await client.query(
          `INSERT INTO user_swipes (swiper_id, target_id, action) VALUES ($1, $2, $3)`,
          [swiperId, targetId, action],
        );
        if (action !== 'like') return { match: null };
        const reciprocal = await client.query(
          `SELECT 1 FROM user_swipes WHERE swiper_id = $1 AND target_id = $2 AND action = 'like'`,
          [targetId, swiperId],
        );
        if (reciprocal.rowCount === 0) return { match: null };
        const [userA, userB] = swiperId < targetId ? [swiperId, targetId] : [targetId, swiperId];
        const existing = await client.query(
          `SELECT id, kind, created_at FROM matches
           WHERE kind = 'people' AND user_a_id = $1 AND user_b_id = $2`,
          [userA, userB],
        );
        if (existing.rowCount) return { match: existing.rows[0] };
        const inserted = await client.query(
          `INSERT INTO matches (kind, user_a_id, user_b_id)
           VALUES ('people', $1, $2)
           RETURNING id, kind, created_at`,
          [userA, userB],
        );
        return { match: inserted.rows[0], created: true };
      });

      sendMatchSignal(swiperId, targetId, action);
      if (outcome.match && 'created' in outcome && outcome.created) {
        const swiper = await getProfile(swiperId);
        await notify(targetId, {
          type: 'people_match',
          title: 'New match',
          body: `You and ${swiper?.display_name ?? 'someone'} both liked each other`,
          data: { matchId: outcome.match.id },
        });
        await notify(swiperId, {
          type: 'people_match',
          title: 'New match',
          body: `You and ${target.display_name} both liked each other`,
          data: { matchId: outcome.match.id },
        });
      }

      res.status(201).json({
        action,
        match: outcome.match
          ? { id: outcome.match.id, kind: outcome.match.kind ?? 'people', createdAt: outcome.match.created_at }
          : null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'You already swiped this person');
      throw err;
    }
  }),
);

peopleRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await presentProfile(req.params.id, req.user!.profileId);
    if (!profile) throw new HttpError(404, 'Profile not found');
    res.json({ profile });
  }),
);
