import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../db';
import { HttpError } from '../errors';
import { asyncHandler, requireAuth, validateBody } from '../middleware';
import { notify } from './notifications';

const decisionSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

export const projectRequestsRouter = Router({ mergeParams: true });
projectRequestsRouter.use(requireAuth);

projectRequestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const project = await one<{ owner_id: string; deleted_at: Date | null }>(
      'SELECT owner_id, deleted_at FROM projects WHERE id = $1',
      [req.params.id],
    );
    if (!project || project.deleted_at) throw new HttpError(404, 'Project not found');
    if (project.owner_id !== req.user!.profileId) {
      throw new HttpError(403, 'Only the owner can view requests');
    }
    const rows = await query(
      `SELECT mr.id, mr.project_id, mr.requester_id, mr.status, mr.created_at, mr.responded_at,
              pr.display_name, pr.role, pr.bio, s.ratings
       FROM match_requests mr
       JOIN profiles pr ON pr.id = mr.requester_id
       LEFT JOIN swipes s ON s.project_id = mr.project_id AND s.swiper_id = mr.requester_id
       WHERE mr.project_id = $1
       ORDER BY mr.created_at DESC`,
      [req.params.id],
    );
    res.json({
      requests: rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        status: row.status,
        createdAt: row.created_at,
        respondedAt: row.responded_at,
        ratings: row.ratings ?? {},
        requester: {
          id: row.requester_id,
          displayName: row.display_name,
          role: row.role,
          bio: row.bio,
        },
      })),
    });
  }),
);

export const matchRequestsRouter = Router();
matchRequestsRouter.use(requireAuth);

matchRequestsRouter.patch(
  '/:id',
  validateBody(decisionSchema),
  asyncHandler(async (req, res) => {
    const decision = (req.body as z.infer<typeof decisionSchema>).status;
    const existing = await one<{
      id: string;
      project_id: string;
      requester_id: string;
      status: string;
      owner_id: string;
      title: string;
    }>(
      `SELECT mr.id, mr.project_id, mr.requester_id, mr.status, p.owner_id, p.title
       FROM match_requests mr
       JOIN projects p ON p.id = mr.project_id
       WHERE mr.id = $1 AND p.deleted_at IS NULL`,
      [req.params.id],
    );
    if (!existing) throw new HttpError(404, 'Request not found');
    if (existing.owner_id !== req.user!.profileId) throw new HttpError(403, 'Only the owner can respond');
    if (existing.status !== 'pending') throw new HttpError(409, 'Request has already been answered');

    if (decision === 'declined') {
      const updated = await one(
        `UPDATE match_requests SET status = 'declined', responded_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, status, responded_at`,
        [existing.id],
      );
      res.json({ request: updated, match: null });
      return;
    }

    const result = await tx(async (client) => {
      const updated = await client.query(
        `UPDATE match_requests SET status = 'accepted', responded_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, status, responded_at`,
        [existing.id],
      );
      if (updated.rowCount === 0) throw new HttpError(409, 'Request has already been answered');
      const match = await client.query(
        `INSERT INTO matches (kind, project_id, user_a_id, user_b_id)
         VALUES ('project', $1, $2, $3)
         RETURNING id, kind, project_id, user_a_id, user_b_id, created_at`,
        [existing.project_id, existing.requester_id, existing.owner_id],
      );
      return { request: updated.rows[0], match: match.rows[0] };
    });

    await notify(existing.requester_id, {
      type: 'request_accepted',
      title: 'Request accepted',
      body: `You can now chat about ${existing.title}`,
      data: { matchId: result.match.id, projectId: existing.project_id },
    });

    res.json({
      request: {
        id: result.request.id,
        status: result.request.status,
        respondedAt: result.request.responded_at,
      },
      match: {
        id: result.match.id,
        kind: result.match.kind,
        projectId: result.match.project_id,
        createdAt: result.match.created_at,
      },
    });
  }),
);
