import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../config';
import { one, query } from '../db';
import { HttpError } from '../errors';
import { asyncHandler, requireAdmin, requireAuth, validateBody } from '../middleware';
import { invalidateAllScores } from './scoring';

const createCriterion = z.object({
  role: z.enum(ROLES),
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,40}$/),
  label: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(100).optional(),
});

const patchCriterion = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

const patchWeight = z.object({
  weight: z.number().gt(0).lte(10),
});

function mapCriterion(row: Record<string, any>) {
  return {
    id: row.id as string,
    role: row.role as string,
    key: row.key as string,
    label: row.label as string,
    sortOrder: row.sort_order as number,
    active: row.active as boolean,
  };
}

export const criteriaRouter = Router();
criteriaRouter.use(requireAuth);

criteriaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await one<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1', [
      req.user!.profileId,
    ]);
    if (!profile?.role) throw new HttpError(403, 'Select a role before continuing');
    const rows = await query(
      `SELECT id, role, key, label, sort_order, active
       FROM rating_criteria
       WHERE role = $1 AND active = TRUE
       ORDER BY sort_order, key`,
      [profile.role],
    );
    res.json({ criteria: rows.map(mapCriterion) });
  }),
);

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/rating-criteria',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT id, role, key, label, sort_order, active
       FROM rating_criteria
       ORDER BY role, sort_order, key`,
    );
    res.json({ criteria: rows.map(mapCriterion) });
  }),
);

adminRouter.post(
  '/rating-criteria',
  validateBody(createCriterion),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createCriterion>;
    try {
      const row = await one(
        `INSERT INTO rating_criteria (role, key, label, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, role, key, label, sort_order, active`,
        [body.role, body.key, body.label, body.sortOrder ?? 0],
      );
      await invalidateAllScores();
      res.status(201).json({ criterion: mapCriterion(row!) });
    } catch (err) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === '23505') {
        throw new HttpError(409, 'Criterion already exists for that role');
      }
      throw err;
    }
  }),
);

adminRouter.patch(
  '/rating-criteria/:id',
  validateBody(patchCriterion),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof patchCriterion>;
    const sets: string[] = [];
    const params: unknown[] = [req.params.id];
    if (body.label !== undefined) {
      params.push(body.label);
      sets.push(`label = $${params.length}`);
    }
    if (body.active !== undefined) {
      params.push(body.active);
      sets.push(`active = $${params.length}`);
    }
    if (body.sortOrder !== undefined) {
      params.push(body.sortOrder);
      sets.push(`sort_order = $${params.length}`);
    }
    const row = await one(
      `UPDATE rating_criteria SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, role, key, label, sort_order, active`,
      params,
    );
    if (!row) throw new HttpError(404, 'Criterion not found');
    await invalidateAllScores();
    res.json({ criterion: mapCriterion(row) });
  }),
);

adminRouter.delete(
  '/rating-criteria/:id',
  asyncHandler(async (req, res) => {
    const row = await one('DELETE FROM rating_criteria WHERE id = $1 RETURNING id', [req.params.id]);
    if (!row) throw new HttpError(404, 'Criterion not found');
    await invalidateAllScores();
    res.status(204).send();
  }),
);

adminRouter.get(
  '/role-weights',
  asyncHandler(async (_req, res) => {
    const rows = await query<{ role: string; weight: string }>(
      'SELECT role, weight FROM role_weights ORDER BY role',
    );
    res.json({
      weights: rows.map((row) => ({ role: row.role, weight: Number(row.weight) })),
    });
  }),
);

adminRouter.patch(
  '/role-weights/:role',
  validateBody(patchWeight),
  asyncHandler(async (req, res) => {
    const role = z.enum(ROLES).safeParse(req.params.role);
    if (!role.success) throw new HttpError(400, 'Unknown role');
    const row = await one<{ role: string; weight: string }>(
      `UPDATE role_weights SET weight = $2 WHERE role = $1 RETURNING role, weight`,
      [role.data, req.body.weight],
    );
    if (!row) throw new HttpError(404, 'Role weight not found');
    await invalidateAllScores();
    res.json({ weight: { role: row.role, weight: Number(row.weight) } });
  }),
);

const premiumSchema = z.object({
  isPremium: z.boolean(),
});

adminRouter.patch(
  '/profiles/:id/premium',
  validateBody(premiumSchema),
  asyncHandler(async (req, res) => {
    const row = await one<{ id: string; is_premium: boolean }>(
      `UPDATE profiles SET is_premium = $2, updated_at = NOW() WHERE id = $1 RETURNING id, is_premium`,
      [req.params.id, (req.body as z.infer<typeof premiumSchema>).isPremium],
    );
    if (!row) throw new HttpError(404, 'Profile not found');
    res.json({ profile: { id: row.id, isPremium: row.is_premium } });
  }),
);
