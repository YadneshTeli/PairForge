import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodSchema } from 'zod';
import { config } from './config';
import { one } from './db';
import { HttpError } from './errors';

export interface AuthUser {
  id: string;
  profileId: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      role?: string;
    }
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Validation failed', parsed.error.flatten()));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.profileId !== 'string') {
      next(new HttpError(401, 'Invalid token'));
      return;
    }
    req.user = {
      id: payload.sub,
      profileId: payload.profileId,
      isAdmin: Boolean(payload.isAdmin),
    };
    next();
  } catch {
    next(new HttpError(401, 'Invalid token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    next(new HttpError(403, 'Admin access required'));
    return;
  }
  next();
}

export async function requireRole(req: Request, _res: Response, next: NextFunction) {
  try {
    const profile = await one<{ role: string | null }>('SELECT role FROM profiles WHERE id = $1', [
      req.user!.profileId,
    ]);
    if (!profile?.role) {
      next(new HttpError(403, 'Select a role before continuing'));
      return;
    }
    req.role = profile.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
