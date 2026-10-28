import { createClient } from 'redis';
import { config } from './config';

type Redis = ReturnType<typeof createClient>;

let client: Redis | null = null;
let connecting: Promise<Redis> | null = null;

export async function getRedis(): Promise<Redis> {
  if (client?.isOpen) return client;
  if (!connecting) {
    const created = createClient({ url: config.redisUrl });
    created.on('error', (err) => {
      console.error('Redis error', err);
    });
    connecting = created.connect().then(() => {
      client = created;
      return created;
    });
  }
  return connecting;
}

export async function closeRedis(): Promise<void> {
  connecting = null;
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
}
