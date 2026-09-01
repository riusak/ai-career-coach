import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
        passWithNoTests: true,
    // Exclude the k9/harness working-tree mirror (e.g. .kilo/worktrees/<branch>)
    // so stale copies of the project's tests don't run twice.
    exclude: ['**/node_modules/**', '**/.kilo/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
