import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db';
import { HttpError, isUniqueViolation } from '../errors';
import { asyncHandler, requireAuth, requireRole, validateBody } from '../middleware';
import { notify } from './notifications';
import { one } from '../db';
import { invalidateProjectScore } from './scoring';

const swipeSchema = z.object({
  action: z.enum(['pass', 'like', 'superlike']),
  ratings: z.record(z.string(), z.number()).optional(),
});

export const swipesRouter = Router({ mergeParams: true });
swipesRouter.use(requireAuth, requireRole);

swipesRouter.post(
  '/',
  validateBody(swipeSchema),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    const profileId = req.user!.profileId;
    const { action, ratings } = req.body as z.infer<typeof swipeSchema>;

    const project = await one<{ id: string; owner_id: string; title: string; deleted_at: Date | null }>(
      'SELECT id, owner_id, title, deleted_at FROM projects WHERE id = $1',
      [projectId],
    );
    if (!project || project.deleted_at) throw new HttpError(404, 'Project not found');
    if (project.owner_id === profileId) throw new HttpError(403, 'You cannot swipe your own project');

    let stored: Record<string, number> = {};
    if (action !== 'pass') {
      const criteria = await query<{ key: string }>(
        `SELECT key FROM rating_criteria WHERE role = $1 AND active = TRUE ORDER BY key`,
        [req.role],
      );
      const expected = criteria.map((row) => row.key);
      const provided = ratings ?? {};
      const got = Object.keys(provided).sort();
      const wanted = [...expected].sort();
      if (got.length !== wanted.length || got.some((key, index) => key !== wanted[index])) {
        throw new HttpError(400, 'Ratings must include exactly the active criteria for your role', {
          expected: wanted,
        });
      }
      for (const key of wanted) {
        const value = provided[key];
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          throw new HttpError(400, `Rating "${key}" must be an integer from 1 to 5`);
        }
        stored[key] = value;
      }
    }

    try {
      const result = await tx(async (client) => {
        const swipe = await client.query(
          `INSERT INTO swipes (project_id, swiper_id, action, ratings)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING id, project_id, action, ratings, created_at`,
          [projectId, profileId, action, JSON.stringify(stored)],
        );
        let matchRequest = null;
        if (action === 'superlike') {
          const request = await client.query(
            `INSERT INTO match_requests (project_id, requester_id)
             VALUES ($1, $2)
             RETURNING id, project_id, status, created_at`,
            [projectId, profileId],
          );
          matchRequest = request.rows[0];
        }
        return { swipe: swipe.rows[0], matchRequest };
      });

      if (action !== 'pass') await invalidateProjectScore(projectId);
      if (action === 'superlike') {
        const swiper = await one<{ display_name: string }>('SELECT display_name FROM profiles WHERE id = $1', [
          profileId,
        ]);
        await notify(project.owner_id, {
          type: 'match_request',
          title: 'New connection request',
          body: `${swiper?.display_name ?? 'Someone'} superliked ${project.title}`,
          data: { projectId, requestId: result.matchRequest.id },
        });
      }

      res.status(201).json({
        swipe: {
          id: result.swipe.id,
          projectId: result.swipe.project_id,
          action: result.swipe.action,
          ratings: result.swipe.ratings,
          createdAt: result.swipe.created_at,
        },
        matchRequest: result.matchRequest
          ? {
              id: result.matchRequest.id,
              projectId: result.matchRequest.project_id,
              status: result.matchRequest.status,
              createdAt: result.matchRequest.created_at,
            }
          : null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'You already swiped this project');
      throw err;
    }
  }),
);
