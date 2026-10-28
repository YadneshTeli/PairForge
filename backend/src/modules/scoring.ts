import { SCORE_CACHE_TTL_SECONDS } from '../config';
import { one } from '../db';
import { getRedis } from '../redis';

export interface ProjectScore {
  successScore: number | null;
  ratingCount: number;
  band: string | null;
}

export function scoreBand(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 4) return 'Promising';
  if (score >= 2.5) return 'Mixed signal';
  return 'Needs work';
}

function cacheKey(projectId: string) {
  return `project:score:${projectId}`;
}

export async function computeProjectScore(projectId: string): Promise<ProjectScore> {
  const row = await one<{ success_score: string | null; rating_count: string }>(
    `
    SELECT
      SUM(sub.rater_avg * rw.weight) / NULLIF(SUM(rw.weight), 0) AS success_score,
      COUNT(*)::int AS rating_count
    FROM (
      SELECT
        s.project_id,
        (SELECT AVG((v)::numeric) FROM jsonb_each_text(s.ratings) AS t(k, v)) AS rater_avg,
        p.role
      FROM swipes s
      JOIN profiles p ON p.id = s.swiper_id
      WHERE s.project_id = $1
        AND s.action IN ('like', 'superlike')
        AND p.role IS NOT NULL
        AND s.ratings <> '{}'::jsonb
    ) sub
    JOIN role_weights rw ON rw.role = sub.role
    GROUP BY sub.project_id
    `,
    [projectId],
  );

  if (!row || Number(row.rating_count) === 0 || row.success_score == null) {
    return { successScore: null, ratingCount: 0, band: null };
  }

  const successScore = Math.round(Number(row.success_score) * 10000) / 10000;
  return {
    successScore,
    ratingCount: Number(row.rating_count),
    band: scoreBand(successScore),
  };
}

export async function getProjectScore(projectId: string): Promise<ProjectScore> {
  const redis = await getRedis();
  const cached = await redis.get(cacheKey(projectId));
  if (cached) return JSON.parse(cached) as ProjectScore;
  const computed = await computeProjectScore(projectId);
  await redis.set(cacheKey(projectId), JSON.stringify(computed), { EX: SCORE_CACHE_TTL_SECONDS });
  return computed;
}

export async function invalidateProjectScore(projectId: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(cacheKey(projectId));
}

export async function invalidateAllScores(): Promise<void> {
  const redis = await getRedis();
  const keys = await redis.keys('project:score:*');
  if (keys.length > 0) await redis.del(keys);
}
