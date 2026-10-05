# CLAUDE.md — Iris Store

Arabic-first (RTL), mobile-first e-commerce **website** with a built-in admin dashboard.
Owner-facing docs are in Arabic under `docs/`. **Start every session by reading `docs/HANDOFF.md`.**

## Commands

```bash
pnpm install
pnpm db:local start        # local PostgreSQL without Docker (scripts/dev-db.sh)
pnpm db:migrate            # apply SQL migrations in ./drizzle
pnpm db:seed               # demo catalog + settings (idempotent)
pnpm dev                   # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test   # = pnpm check
pnpm test:e2e              # Playwright (mobile + desktop projects)
pnpm db:generate           # after editing src/server/db/schema/* → new migration
pnpm stitch:sync           # pull Stitch design (needs STITCH_API_KEY)
```

## Stack

Next.js 16 (App Router, `proxy.ts` not middleware, async request APIs) · React 19 · TypeScript strict ·
Tailwind CSS 4 (CSS-first config in `src/app/globals.css`) · next-intl (ar default, en) ·
PostgreSQL + Drizzle ORM (`pg` driver) · Better Auth (+ argon2id) · Zod 4 · Vitest · Playwright.

**Next.js 16 differs from older versions** — read `node_modules/next/dist/docs/` before using an API you
are unsure about (e.g. `revalidateTag(tag, 'max')` needs 2 args, `updateTag` for read-your-writes).

## Layout

```
src/app/[locale]/(store)   storefront routes        src/server/db        schema, client, migrate, seed
src/app/[locale]/(auth)    login/register/verify     src/server/auth      Better Auth config, guards, RBAC
src/app/[locale]/admin     admin dashboard           src/server/services  domain logic (pure-ish, tested)
src/app/api                auth handler, media, cron src/server/security  rate limit, headers, crypto
src/components/ui          primitives                src/i18n + messages/ translations (ar.json, en.json)
tests/unit · tests/integration (real Postgres) · tests/e2e (Playwright)
```

## Non-negotiable rules

- **Server is the source of truth**: prices, totals, discounts, stock are computed server-side inside a
  DB transaction. Never trust client-sent prices or quantities beyond validation.
- **Every Server Action / route handler**: validate input with Zod → authenticate → authorize
  (`requirePermission`) → rate-limit when abuse-prone. Proxy is NOT an auth layer.
- Money = integer minor units (`bigint` mode number) + store currency; format only at the edge.
- Customer-visible text goes through next-intl (`messages/ar.json` + `messages/en.json`, keep keys in sync).
  Use logical CSS (`ms-*`, `pe-*`, `start-*`, `text-start`) — never `ml-*`/`left-*` — RTL must work.
- Localized DB content is JSONB `{ ar, en? }` (`LocalizedText`); read with `t(localized, locale)`.
- Never log secrets, passwords, OTPs, tokens or full card/ID data (pino redaction is configured).
- Uploaded files: sniff magic bytes, cap size, re-encode with sharp, random keys. No SVG uploads.
- Public identifiers for guest access are random tokens stored **hashed** (sha256), never sequential IDs.
- Admin accounts must have 2FA; guard admin routes with `requireStaff()` in layouts **and** actions.
- Write tests with every feature: unit for pure logic, integration for DB services, e2e for flows.
- Keep server-only libraries (zod, drizzle, sharp…) out of client bundles: modules imported by
  `"use client"` files must not import them (e.g. `lib/listing.ts` vs server-only `lib/listing-params.ts`).
  The E2E CSP test catches zod's `Function()` probe if it slips back in.

## Workflow

- Branch: `claude/nifty-turing-csz4ep`. Commit per logical step; push at the end of each phase.
- At the end of each phase: write `docs/progress/NN-*.md` (Arabic summary), update `docs/HANDOFF.md`
  and the phase table in `docs/PLAN.md`.
- Design source: Google Stitch project `1055627941288859978` (see Phase 8 in `docs/PLAN.md`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
