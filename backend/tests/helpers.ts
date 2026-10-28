import { Client } from 'pg';
import request from 'supertest';
import { app } from '../src/app';
import { config } from '../src/config';
import { closePool, getPool, query } from '../src/db';
import { runMigrations } from '../src/migrate';
import { closeRedis, getRedis } from '../src/redis';

export { app };

export async function ensureTestDatabase(): Promise<void> {
  const url = new URL(config.databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
    throw new Error(`Refusing to create database "${dbName}"`);
  }
  url.pathname = '/postgres';
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${dbName}`);
  }
  await admin.end();
}

export async function resetData(): Promise<void> {
  await query('TRUNCATE users CASCADE');
  await query(`
    UPDATE role_weights SET weight = CASE role
      WHEN 'vc' THEN 1.5
      WHEN 'founder' THEN 1.2
      WHEN 'cofounder' THEN 1.2
      WHEN 'developer' THEN 1.1
      WHEN 'freelancer' THEN 1.0
      WHEN 'student' THEN 0.8
    END
  `);
  const redis = await getRedis();
  const keys = await redis.keys('project:score:*');
  const compat = await redis.keys('compat:*');
  const all = [...keys, ...compat];
  if (all.length) await redis.del(all);
}

export async function prepareDatabase(): Promise<void> {
  await ensureTestDatabase();
  await runMigrations();
  await getRedis();
  await resetData();
}

export async function shutdown(): Promise<void> {
  await closeRedis();
  await closePool();
}

export async function register(input: {
  email: string;
  username: string;
  password?: string;
  displayName?: string;
  role?: string;
}) {
  const password = input.password ?? 'password123';
  const response = await request(app).post('/api/auth/register').send({
    email: input.email,
    username: input.username,
    password,
    displayName: input.displayName ?? input.username,
  });
  if (response.status !== 201) {
    throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  if (input.role) {
    const roleResponse = await request(app)
      .patch('/api/profile/role')
      .set('Authorization', `Bearer ${response.body.token}`)
      .send({ role: input.role });
    if (roleResponse.status !== 200) {
      throw new Error(`role failed: ${roleResponse.status} ${JSON.stringify(roleResponse.body)}`);
    }
    response.body.profile = roleResponse.body.profile;
  }
  return response.body as {
    token: string;
    user: { id: string; email: string; isAdmin: boolean };
    profile: { id: string; role: string | null; displayName: string };
  };
}

export async function asAdmin(userId: string, email: string, password = 'password123') {
  await getPool().query('UPDATE users SET is_admin = TRUE WHERE id = $1', [userId]);
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.status !== 200) throw new Error('admin login failed');
  return response.body.token as string;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const RATINGS: Record<string, Record<string, number>> = {
  vc: { market_size: 5, monetization: 5, investability: 5 },
  developer: { feasibility: 3, scope_clarity: 3, would_build: 3 },
  student: { learning: 1, interest: 1, approachable: 1 },
  founder: { originality: 4, founder_fit: 4, would_cofound: 4 },
};
