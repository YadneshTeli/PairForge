import 'dotenv/config';
import { createServer } from 'http';
import { config } from './config';
import { app } from './app';
import { runMigrations } from './migrate';
import { attachSocket } from './socket';

async function main() {
  await runMigrations();
  const server = createServer(app);
  attachSocket(server);
  server.listen(config.port, () => {
    console.log(`PairForge API listening on ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
