import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  MATCHMAKING_URL: z.string().default('http://localhost:8000'),
  FCM_SERVER_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment: ${missing}`);
}

export const config = {
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  corsOrigin: parsed.data.CORS_ORIGIN,
  matchmakingUrl: parsed.data.MATCHMAKING_URL.replace(/\/$/, ''),
  fcmServerKey: parsed.data.FCM_SERVER_KEY,
};

export const ROLES = ['founder', 'cofounder', 'vc', 'developer', 'freelancer', 'student'] as const;
export type UserRole = (typeof ROLES)[number];

export const SCORE_CACHE_TTL_SECONDS = 15 * 60;
