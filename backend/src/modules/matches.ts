import { Router } from 'express';
import { one, query } from '../db';
import { HttpError } from '../errors';
import { asyncHandler, requireAuth } from '../middleware';

export async function assertMember(matchId: string, profileId: string) {
  const match = await one<{ id: string; user_a_id: string; user_b_id: string }>(
    `SELECT id, user_a_id, user_b_id FROM matches WHERE id = $1`,
    [matchId],
  );
  if (!match) throw new HttpError(404, 'Match not found');
  if (match.user_a_id !== profileId && match.user_b_id !== profileId) {
    throw new HttpError(403, 'You are not part of this match');
  }
  return match;
}

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

matchesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = req.user!.profileId;
    const rows = await query(
      `SELECT m.id, m.kind, m.project_id, m.created_at,
              CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS other_id,
              pr.display_name AS other_name, pr.role AS other_role,
              p.title AS project_title,
              lm.content AS last_content, lm.created_at AS last_at,
              (
                SELECT COUNT(*)::int FROM messages msg
                WHERE msg.match_id = m.id AND msg.sender_id <> $1 AND msg.read_at IS NULL
              ) AS unread_count
       FROM matches m
       JOIN profiles pr ON pr.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       LEFT JOIN projects p ON p.id = m.project_id
       LEFT JOIN LATERAL (
         SELECT content, created_at FROM messages
         WHERE match_id = m.id
         ORDER BY created_at DESC
         LIMIT 1
       ) lm ON TRUE
       WHERE m.user_a_id = $1 OR m.user_b_id = $1
       ORDER BY COALESCE(lm.created_at, m.created_at) DESC`,
      [me],
    );
    res.json({
      matches: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        projectId: row.project_id,
        projectTitle: row.project_title,
        createdAt: row.created_at,
        unreadCount: Number(row.unread_count),
        lastMessage: row.last_content
          ? { content: row.last_content, createdAt: row.last_at }
          : null,
        other: { id: row.other_id, displayName: row.other_name, role: row.other_role },
      })),
    });
  }),
);

matchesRouter.post(
  '/:id/pair',
  asyncHandler(async (req, res) => {
    await assertMember(req.params.id, req.user!.profileId);
    const row = await one<{ id: string; match_id: string; document: string; revision: number }>(
      `INSERT INTO pair_sessions (match_id)
       VALUES ($1)
       ON CONFLICT (match_id) DO UPDATE SET match_id = EXCLUDED.match_id
       RETURNING id, match_id, document, revision`,
      [req.params.id],
    );
    res.status(201).json({
      session: {
        id: row!.id,
        matchId: row!.match_id,
        document: row!.document,
        revision: row!.revision,
      },
    });
  }),
);

matchesRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await assertMember(req.params.id, req.user!.profileId);
    const rows = await query(
      `SELECT id, match_id, sender_id, content, created_at, read_at
       FROM messages
       WHERE match_id = $1
       ORDER BY created_at ASC
       LIMIT 200`,
      [req.params.id],
    );
    res.json({
      messages: rows.map((row) => ({
        id: row.id,
        matchId: row.match_id,
        senderId: row.sender_id,
        content: row.content,
        createdAt: row.created_at,
        readAt: row.read_at,
      })),
    });
  }),
);
