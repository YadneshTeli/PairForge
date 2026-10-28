import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware';
import { adminRouter, criteriaRouter } from './modules/admin';
import { authRouter } from './modules/auth';
import { eventsRouter, joinRequestsRouter, teamsRouter } from './modules/events';
import { matchesRouter } from './modules/matches';
import { markRead, saveDeviceToken, unreadCount, listNotifications } from './modules/notifications';
import { peopleRouter } from './modules/people';
import { profileRouter, profilesRouter } from './modules/profiles';
import { projectsRouter } from './modules/projects';
import { matchRequestsRouter, projectRequestsRouter } from './modules/requests';
import { reportsRouter } from './modules/reports';
import { swipesRouter } from './modules/swipes';
import { asyncHandler, requireAuth, validateBody } from './middleware';
import { z } from 'zod';

export const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pairforge-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/rating-criteria', criteriaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:id/swipe', swipesRouter);
app.use('/api/projects/:id/requests', projectRequestsRouter);
app.use('/api/match-requests', matchRequestsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/people', peopleRouter);
app.use('/api/events', eventsRouter);
app.use('/api', teamsRouter);
app.use('/api/project-join-requests', joinRequestsRouter);

const deviceSchema = z.object({
  token: z.string().trim().min(8).max(512),
  platform: z.enum(['android', 'ios', 'web']),
});

const readSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

app.get(
  '/api/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await listNotifications(req.user!.profileId);
    res.json({
      notifications: notifications.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
    });
  }),
);

app.get(
  '/api/notifications/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ count: await unreadCount(req.user!.profileId) });
  }),
);

app.post(
  '/api/notifications/read',
  requireAuth,
  validateBody(readSchema),
  asyncHandler(async (req, res) => {
    await markRead(req.user!.profileId, req.body.ids);
    res.json({ ok: true });
  }),
);

app.post(
  '/api/devices',
  requireAuth,
  validateBody(deviceSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof deviceSchema>;
    await saveDeviceToken(req.user!.profileId, body.token, body.platform);
    res.status(204).send();
  }),
);

app.use(errorHandler);
