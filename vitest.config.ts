/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    // Vitest will pick up TypeScript settings from the project's `tsconfig.json` by default.
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
  // Note: if tests require inlining of certain deps, configure via `deps.inline` here.
  resolve: {
    alias: {
      '#tests': path.resolve(__dirname, './src/__tests__'),
    },
  },
});
