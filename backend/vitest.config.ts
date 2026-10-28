import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    setupFiles: ['./tests/setup-env.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
