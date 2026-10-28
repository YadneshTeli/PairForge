import { Router } from 'express';
import { z } from 'zod';
import { one } from '../db';
import { asyncHandler, requireAuth, validateBody } from '../middleware';

const reportSchema = z.object({
  targetType: z.enum(['project', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
});

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.post(
  '/',
  validateBody(reportSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof reportSchema>;
    const row = await one<{ id: string; created_at: Date }>(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [req.user!.profileId, body.targetType, body.targetId, body.reason],
    );
    res.status(201).json({ report: { id: row!.id, createdAt: row!.created_at } });
  }),
);
