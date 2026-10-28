import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { HttpError } from '../errors';
import { asyncHandler, requireAuth, requireRole, validateBody } from '../middleware';
import { getProjectScore } from './scoring';

const stageSchema = z.enum(['idea', 'prototype', 'mvp', 'launched']);

const projectBody = z.object({
  title: z.string().trim().min(1).max(120),
  tagline: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  stage: stageSchema,
  lookingFor: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

const projectPatch = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    tagline: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    stage: stageSchema.optional(),
    lookingFor: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), 'No fields to update');

interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  tagline: string;
  description: string;
  stage: string;
  looking_for: string[];
  tags: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  owner_display_name?: string;
  owner_role?: string | null;
}

export function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    stage: row.stage,
    lookingFor: row.looking_for ?? [],
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: row.owner_display_name
      ? { id: row.owner_id, displayName: row.owner_display_name, role: row.owner_role ?? null }
      : undefined,
  };
}

const projectSelect = `
  p.id, p.owner_id, p.title, p.tagline, p.description, p.stage, p.looking_for, p.tags,
  p.created_at, p.updated_at, p.deleted_at,
  pr.display_name AS owner_display_name, pr.role AS owner_role
`;

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = raw.indexOf('|');
    if (separator <= 0) return null;
    const createdAt = raw.slice(0, separator);
    const id = raw.slice(separator + 1);
    if (!createdAt || !z.string().uuid().safeParse(id).success) return null;
    if (Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

async function findActive(id: string): Promise<ProjectRow | null> {
  return one<ProjectRow>(
    `SELECT ${projectSelect}
     FROM projects p
     JOIN profiles pr ON pr.id = p.owner_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  );
}

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.post(
  '/',
  validateBody(projectBody),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof projectBody>;
    const row = await one<ProjectRow>(
      `WITH inserted AS (
         INSERT INTO projects (owner_id, title, tagline, description, stage, looking_for, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *
       )
       SELECT ${projectSelect}
       FROM inserted p
       JOIN profiles pr ON pr.id = p.owner_id`,
      [req.user!.profileId, body.title, body.tagline, body.description, body.stage, body.lookingFor, body.tags],
    );
    await query(
      `INSERT INTO project_members (project_id, profile_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [row!.id, req.user!.profileId],
    );
    res.status(201).json({ project: mapProject(row!) });
  }),
);

projectsRouter.get(
  '/feed',
  requireRole,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = typeof req.query.cursor === 'string' ? decodeCursor(req.query.cursor) : null;
    if (req.query.cursor && !cursor) throw new HttpError(400, 'Invalid cursor');
    const params: unknown[] = [req.user!.profileId];
    let cursorSql = '';
    if (cursor) {
      params.push(cursor.createdAt, cursor.id);
      cursorSql = `AND (p.created_at, p.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    const rows = await query<ProjectRow>(
      `SELECT ${projectSelect}
       FROM projects p
       JOIN profiles pr ON pr.id = p.owner_id
       WHERE p.deleted_at IS NULL
         AND p.owner_id <> $1
         AND NOT EXISTS (
           SELECT 1 FROM swipes s WHERE s.project_id = p.id AND s.swiper_id = $1
         )
         ${cursorSql}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $${params.length}`,
      params,
    );
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    res.json({
      projects: page.map(mapProject),
      nextCursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null,
    });
  }),
);

projectsRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const rows = await query<ProjectRow>(
      `SELECT ${projectSelect}
       FROM projects p
       JOIN profiles pr ON pr.id = p.owner_id
       WHERE p.owner_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [req.user!.profileId],
    );
    const projects = await Promise.all(
      rows.map(async (row) => ({
        ...mapProject(row),
        ...(await getProjectScore(row.id)),
      })),
    );
    res.json({ projects });
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await findActive(req.params.id);
    if (!row) throw new HttpError(404, 'Project not found');
    const project = mapProject(row);
    if (row.owner_id === req.user!.profileId) {
      res.json({ project: { ...project, ...(await getProjectScore(row.id)) } });
      return;
    }
    res.json({ project });
  }),
);

projectsRouter.get(
  '/:id/score',
  asyncHandler(async (req, res) => {
    const row = await findActive(req.params.id);
    if (!row) throw new HttpError(404, 'Project not found');
    if (row.owner_id !== req.user!.profileId) throw new HttpError(403, 'Only the owner can view the score');
    res.json(await getProjectScore(row.id));
  }),
);

projectsRouter.patch(
  '/:id',
  validateBody(projectPatch),
  asyncHandler(async (req, res) => {
    const existing = await findActive(req.params.id);
    if (!existing) throw new HttpError(404, 'Project not found');
    if (existing.owner_id !== req.user!.profileId) throw new HttpError(403, 'Only the owner can edit this project');
    const body = req.body as z.infer<typeof projectPatch>;
    const sets: string[] = [];
    const params: unknown[] = [req.params.id];
    const mapping: Array<[keyof typeof body, string]> = [
      ['title', 'title'],
      ['tagline', 'tagline'],
      ['description', 'description'],
      ['stage', 'stage'],
      ['lookingFor', 'looking_for'],
      ['tags', 'tags'],
    ];
    for (const [key, column] of mapping) {
      if (body[key] !== undefined) {
        params.push(body[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    sets.push('updated_at = NOW()');
    const row = await one<ProjectRow>(
      `WITH updated AS (
         UPDATE projects SET ${sets.join(', ')} WHERE id = $1 RETURNING *
       )
       SELECT ${projectSelect}
       FROM updated p
       JOIN profiles pr ON pr.id = p.owner_id`,
      params,
    );
    res.json({ project: { ...mapProject(row!), ...(await getProjectScore(row!.id)) } });
  }),
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await one<{ owner_id: string; deleted_at: Date | null }>(
      'SELECT owner_id, deleted_at FROM projects WHERE id = $1',
      [req.params.id],
    );
    if (!existing || existing.deleted_at) throw new HttpError(404, 'Project not found');
    if (existing.owner_id !== req.user!.profileId) throw new HttpError(403, 'Only the owner can delete this project');
    await query('UPDATE projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(204).send();
  }),
);

export async function assertProjectOwner(projectId: string, profileId: string) {
  const project = await one<{ owner_id: string; title: string }>(
    'SELECT owner_id, title FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [projectId],
  );
  if (!project) throw new HttpError(404, 'Project not found');
  if (project.owner_id !== profileId) throw new HttpError(403, 'Only the owner can do that');
  return project;
}
