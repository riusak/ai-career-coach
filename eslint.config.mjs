import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
    // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
        // Scripts utilitaires (test SMTP, etc.) — pas du code source applicatif
    'scripts/**',
    // k9/harness working-tree mirror (e.g. .kilo/worktrees/<branch>) — not
    // project source; linting it double-counts files and flags stale scripts.
    '.kilo/**',
  ]),
]);

export default eslintConfig;
