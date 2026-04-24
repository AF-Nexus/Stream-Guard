# Channelzz

## Overview

Channelzz is a live TV streaming platform (Malawi-built). React + Vite frontend, Express API backend, PostgreSQL via Drizzle, Clerk auth (Google sign-in). m3u8 channel URLs are proxied through the backend with short-lived JWT tickets so the origin URL never reaches the browser. Admin panel manages channels, categories, users (subscriptions, ban, days), announcements (24h auto-expire), pricing, and stats.

Admin email: `efkidgamer@gmail.com`. First sign-in with that email becomes admin automatically.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
