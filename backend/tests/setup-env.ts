process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://postgres:password@localhost:5432/pairforge_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_SECRET ??= 'test-secret-test-secret';
process.env.MATCHMAKING_URL ??= 'http://127.0.0.1:9';
process.env.FCM_SERVER_KEY ??= '';
