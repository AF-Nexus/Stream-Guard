# Channelzz

## Overview

Channelzz is a self-contained live TV streaming platform (Malawi-built). React + Vite frontend, Express API backend, **SQLite (better-sqlite3) via Drizzle ORM**, and **email + password auth** with bcrypt + JWT cookie. m3u8 channel URLs are proxied through the backend with short-lived JWT tickets so the origin URL never reaches the browser. Admin panel manages channels, categories, users (subscriptions, ban, days), announcements (24h auto-expire), pricing, and stats.

Admin email: `efkidgamer@gmail.com`. The first user to sign up with that email is automatically promoted to admin.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24
- **Package manager**: pnpm 10
- **TypeScript**: 5.9
- **API framework**: Express 5
- **Database**: SQLite via `better-sqlite3` + Drizzle ORM (file-based, single-file, zero external services). Tables auto-created on startup via `CREATE TABLE IF NOT EXISTS`.
- **Auth**: bcryptjs (password hashing) + jsonwebtoken (httpOnly cookie session)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (ESM bundle for the API; `better-sqlite3` and `bcrypt` are externalized)

## Required env vars

- `SESSION_SECRET` — JWT signing secret for the auth cookie
- `STREAM_SECRET` — JWT signing secret for stream tokens
- `DATABASE_PATH` — path to the SQLite file (default `./data/channelzz.db`; on Render set to `/var/data/channelzz.db` and mount a disk at `/var/data`)
- `PORT` — HTTP port

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/channelzz run dev` — run web frontend locally

See `README.md` for deployment instructions (Render with persistent disk).
