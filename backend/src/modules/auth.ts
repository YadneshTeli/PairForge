import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { one, tx } from '../db';
import { HttpError, isUniqueViolation } from '../errors';
import { asyncHandler, requireAuth, validateBody } from '../middleware';
import { getProfile, loadSkills, mapProfile } from './profiles';

const credentials = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
});

const registerSchema = credentials.extend({
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,30}$/, 'Username must be 3-30 letters, numbers, or underscores'),
  displayName: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = credentials;

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  is_admin: boolean;
  is_active: boolean;
}

function mapUser(row: Pick<UserRow, 'id' | 'email' | 'username' | 'is_admin'>) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    isAdmin: row.is_admin,
  };
}

function signToken(user: Pick<UserRow, 'id' | 'is_admin'>, profileId: string) {
  return jwt.sign(
    { sub: user.id, profileId, isAdmin: user.is_admin },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

async function sessionFor(user: UserRow, profileId: string) {
  const profile = await getProfile(profileId);
  if (!profile) throw new HttpError(500, 'Profile missing');
  const skills = await loadSkills([profileId]);
  return {
    token: signToken(user, profileId),
    user: mapUser(user),
    profile: mapProfile(profile, skills.get(profileId) ?? []),
  };
}

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password, displayName } = req.body as z.infer<typeof registerSchema>;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const created = await tx(async (client) => {
        const userResult = await client.query<UserRow>(
          `INSERT INTO users (email, username, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, email, username, password_hash, is_admin, is_active`,
          [email.toLowerCase(), username, passwordHash],
        );
        const user = userResult.rows[0];
        const profileResult = await client.query<{ id: string }>(
          `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2) RETURNING id`,
          [user.id, displayName?.trim() || username],
        );
        return { user, profileId: profileResult.rows[0].id };
      });
      res.status(201).json(await sessionFor(created.user, created.profileId));
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'Email or username already exists');
      throw err;
    }
  }),
);

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await one<UserRow>(
      `SELECT id, email, username, password_hash, is_admin, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    if (!user.is_active) throw new HttpError(403, 'Account is inactive');
    const profile = await one<{ id: string }>('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
    if (!profile) throw new HttpError(500, 'Profile missing');
    res.json(await sessionFor(user, profile.id));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await one<UserRow>(
      `SELECT id, email, username, password_hash, is_admin, is_active FROM users WHERE id = $1`,
      [req.user!.id],
    );
    if (!user || !user.is_active) throw new HttpError(401, 'Account unavailable');
    const profile = await getProfile(req.user!.profileId);
    if (!profile) throw new HttpError(404, 'Profile not found');
    const skills = await loadSkills([profile.id]);
    res.json({ user: mapUser(user), profile: mapProfile(profile, skills.get(profile.id) ?? []) });
  }),
);
