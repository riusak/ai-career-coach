<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ForPro AI - Guidelines & Conventions

## 1. Project Context & Stack

- **Project**: ForPro AI (MVP for academic/portfolio validation).
- **Stack**: Next.js (App Router), TypeScript (Strict), Tailwind CSS, Supabase (SSR via free tier), Vitest, Playwright.

## 2. Coding Conventions

- Write clean, functional, and modular React components.
- Maintain zero `any` types (strict TypeScript compliance).
- Implement mandatory error handling and loading states for all asynchronous components.

## 3. Definition of Done (DoD)

A task is only complete when:

1. The code compiles successfully without TypeScript or ESLint errors (`npm run lint`, `npm run type-check`).
2. Unit tests pass (`npm run test`).
3. No configuration files were deleted or overwritten without explicit human confirmation.
