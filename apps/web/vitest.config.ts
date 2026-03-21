import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: [
      'lib/**/__tests__/**/*.test.ts',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
    ],
  },
});
