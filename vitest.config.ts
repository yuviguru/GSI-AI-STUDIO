import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      'dist',
      '**/.next/**',
      'e2e/**',
      'apps/*/node_modules/**',
      'packages/*/node_modules/**',
      // Parallel agent worktrees are scratch copies of the repo; their
      // spec files are stale snapshots that would otherwise fail with
      // outdated mocks. Real source-of-truth tests live at the repo root
      // (apps/, lib/, hooks/, components/, packages/).
      '.claude/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'hooks/**', 'components/**', 'app/api/**'],
      exclude: ['**/*.spec.*', '**/*.test.*', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@gsi/types': path.resolve(__dirname, 'packages/types/src/index.ts'),
      '@gsi/safety': path.resolve(__dirname, 'packages/safety/src/index.ts'),
      '@gsi/dpdp': path.resolve(__dirname, 'packages/dpdp/src/index.ts'),
      '@gsi/ai': path.resolve(__dirname, 'packages/ai/src'),
      '@gsi/firebase': path.resolve(__dirname, 'packages/firebase/src'),
      '@gsi/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
});
