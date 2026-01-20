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
    tsconfig: 'tsconfig.test.json',
  },
  resolve: {
    alias: {
      '#tests': path.resolve(__dirname, './src/__tests__'),
    },
  },
});
