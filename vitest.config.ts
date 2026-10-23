import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'server/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
