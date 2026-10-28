import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { HttpError, isUniqueViolation } from '../errors';
import { asyncHandler, requireAuth, validateBody } from '../middleware';
import { notify } from './notifications';
import { assertProjectOwner } from './projects';

const eventBody = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(''),
  eventType: z.string().trim().min(1).max(40).default('meetup'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  isOnline: z.boolean().default(false),
  url: z.string().trim().url().nullable().optional(),
});

const joinBody = z.object({
  message: z.string().trim().max(500).default(''),
});

const decisionSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

function mapEvent(row: {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: Date;
  end_date: Date | null;
  location: string | null;
  is_online: boolean;
  url: string | null;
  created_at: Date;
  participant_count?: number | string;
  joined?: boolean;
  creator_name?: string;
}) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorName: row.creator_name ?? null,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    isOnline: row.is_online,
    url: row.url,
    createdAt: row.created_at,
    participantCount: Number(row.participant_count ?? 0),
    joined: Boolean(row.joined),
  };
}

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.post(
  '/',
  validateBody(eventBody),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof eventBody>;
    const row = await one(
      `INSERT INTO events (creator_id, title, description, event_type, start_date, end_date, location, is_online, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        req.user!.profileId,
        body.title,
        body.description,
        body.eventType,
        body.startDate,
        body.endDate ?? null,
        body.location ?? null,
        body.isOnline,
        body.url ?? null,
      ],
    );
    await query(
      `INSERT INTO event_participants (event_id, profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [row!.id, req.user!.profileId],
    );
    const event = await loadEvent(row!.id as string, req.user!.profileId);
    res.status(201).json({ event });
  }),
);

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT e.*, pr.display_name AS creator_name,
              (SELECT COUNT(*)::int FROM event_participants ep WHERE ep.event_id = e.id) AS participant_count,
              EXISTS (
                SELECT 1 FROM event_participants ep WHERE ep.event_id = e.id AND ep.profile_id = $1
              ) AS joined
       FROM events e
       JOIN profiles pr ON pr.id = e.creator_id
       ORDER BY e.start_date ASC`,
      [req.user!.profileId],
    );
    res.json({ events: rows.map((row) => mapEvent(row as never)) });
  }),
);

async function loadEvent(id: string, profileId: string) {
  const row = await one(
    `SELECT e.*, pr.display_name AS creator_name,
            (SELECT COUNT(*)::int FROM event_participants ep WHERE ep.event_id = e.id) AS participant_count,
            EXISTS (
              SELECT 1 FROM event_participants ep WHERE ep.event_id = e.id AND ep.profile_id = $2
            ) AS joined
     FROM events e
     JOIN profiles pr ON pr.id = e.creator_id
     WHERE e.id = $1`,
    [id, profileId],
  );
  return row ? mapEvent(row as never) : null;
}

eventsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const event = await loadEvent(req.params.id, req.user!.profileId);
    if (!event) throw new HttpError(404, 'Event not found');
    res.json({ event });
  }),
);

eventsRouter.post(
  '/:id/join',
  asyncHandler(async (req, res) => {
    const event = await one<{ id: string }>('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (!event) throw new HttpError(404, 'Event not found');
    await query(
      `INSERT INTO event_participants (event_id, profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user!.profileId],
    );
    res.json({ event: await loadEvent(req.params.id, req.user!.profileId) });
  }),
);

eventsRouter.delete(
  '/:id/join',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM event_participants WHERE event_id = $1 AND profile_id = $2', [
      req.params.id,
      req.user!.profileId,
    ]);
    const event = await loadEvent(req.params.id, req.user!.profileId);
    if (!event) throw new HttpError(404, 'Event not found');
    res.json({ event });
  }),
);

export const teamsRouter = Router();
teamsRouter.use(requireAuth);

teamsRouter.post(
  '/projects/:id/join-requests',
  validateBody(joinBody),
  asyncHandler(async (req, res) => {
    const project = await one<{ id: string; owner_id: string; title: string }>(
      'SELECT id, owner_id, title FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id],
    );
    if (!project) throw new HttpError(404, 'Project not found');
    if (project.owner_id === req.user!.profileId) throw new HttpError(400, 'You already own this project');
    const member = await one(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND profile_id = $2',
      [project.id, req.user!.profileId],
    );
    if (member) throw new HttpError(409, 'You are already on this project');
    try {
      const row = await one(
        `INSERT INTO project_join_requests (project_id, requester_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, status, created_at`,
        [project.id, req.user!.profileId, (req.body as z.infer<typeof joinBody>).message],
      );
      await notify(project.owner_id, {
        type: 'join_request',
        title: 'Join request',
        body: `Someone wants to join ${project.title}`,
        data: { projectId: project.id, requestId: row!.id },
      });
      res.status(201).json({ request: { id: row!.id, status: row!.status, createdAt: row!.created_at } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'You already requested to join');
      throw err;
    }
  }),
);

teamsRouter.get(
  '/projects/:id/join-requests',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.id, req.user!.profileId);
    const rows = await query(
      `SELECT jr.id, jr.status, jr.message, jr.created_at, pr.id AS requester_id, pr.display_name, pr.role
       FROM project_join_requests jr
       JOIN profiles pr ON pr.id = jr.requester_id
       WHERE jr.project_id = $1
       ORDER BY jr.created_at DESC`,
      [req.params.id],
    );
    res.json({
      requests: rows.map((row) => ({
        id: row.id,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        requester: { id: row.requester_id, displayName: row.display_name, role: row.role },
      })),
    });
  }),
);

teamsRouter.get(
  '/projects/:id/members',
  asyncHandler(async (req, res) => {
    const project = await one('SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!project) throw new HttpError(404, 'Project not found');
    const rows = await query(
      `SELECT pm.role, pm.created_at, pr.id, pr.display_name, pr.role AS profile_role
       FROM project_members pm
       JOIN profiles pr ON pr.id = pm.profile_id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [req.params.id],
    );
    res.json({
      members: rows.map((row) => ({
        role: row.role,
        joinedAt: row.created_at,
        profile: { id: row.id, displayName: row.display_name, role: row.profile_role },
      })),
    });
  }),
);

export const joinRequestsRouter = Router();
joinRequestsRouter.use(requireAuth);

joinRequestsRouter.patch(
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
      `SELECT jr.id, jr.project_id, jr.requester_id, jr.status, p.owner_id, p.title
       FROM project_join_requests jr
       JOIN projects p ON p.id = jr.project_id
       WHERE jr.id = $1 AND p.deleted_at IS NULL`,
      [req.params.id],
    );
    if (!existing) throw new HttpError(404, 'Request not found');
    if (existing.owner_id !== req.user!.profileId) throw new HttpError(403, 'Only the owner can respond');
    if (existing.status !== 'pending') throw new HttpError(409, 'Request has already been answered');

    if (decision === 'declined') {
      const updated = await one(
        `UPDATE project_join_requests SET status = 'declined', responded_at = NOW()
         WHERE id = $1 RETURNING id, status`,
        [existing.id],
      );
      res.json({ request: updated });
      return;
    }

    await query(
      `UPDATE project_join_requests SET status = 'accepted', responded_at = NOW() WHERE id = $1`,
      [existing.id],
    );
    await query(
      `INSERT INTO project_members (project_id, profile_id, role) VALUES ($1, $2, 'member')
       ON CONFLICT DO NOTHING`,
      [existing.project_id, existing.requester_id],
    );
    await notify(existing.requester_id, {
      type: 'join_accepted',
      title: 'You joined a project',
      body: `Your request to join ${existing.title} was accepted`,
      data: { projectId: existing.project_id },
    });
    res.json({ request: { id: existing.id, status: 'accepted' } });
  }),
);
