<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (שמחות קטנות)

- Business logic lives in `src/server/**` (no React); server actions in `src/actions/**` only validate → authorize → call services. Admin actions must go through `withAdmin` / `assertAdmin` (the admin layout guard is not trusted alone).
- Money is integer agorot everywhere; all prices are computed by `src/server/pricing/engine.ts` on the server.
- Orders become paid ONLY via a verified webhook (`src/server/payments/webhook.ts`). Stock is decremented there with a conditional update; restock goes through `releaseOrderStock` (once).
- Payments: only the `mock` sandbox exists — never present it as a real payment system. See `docs/PAYMENTS.md`.
- Checks before pushing: `npm run typecheck && npm run lint && npm test && npm run build` (E2E: `npm run test:e2e` after build, with seed + admin).
