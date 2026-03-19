import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/**/__tests__/**/*.test.ts', '__tests__/**/*.test.ts'],
  },
});
