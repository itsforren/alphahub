import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 120000,
    sequence: {
      concurrent: false,
    },
    globalSetup: ['tests/integration/setup.ts', 'tests/integration/teardown.ts'],
    passWithNoTests: true,
    env: {
      // Vitest loads .env.test automatically when present
    },
  },
});
