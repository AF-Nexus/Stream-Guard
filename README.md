# Channelzz

A live TV streaming platform.

## Features

- Google sign-in (Clerk)
- Dark/Light theme switcher
- Admin portal: manage channels (m3u8), categories, users, subscriptions, announcements (auto-expire after 24h), pricing
- 4-hour free trial for new users (configurable)
- Subscription days, ban users, real-time tracking with user-agent
- Stream proxy: m3u8 origin URLs are NEVER exposed to the browser. Every request is signed with a short-lived JWT and proxied through the backend.
- WhatsApp upgrade flow

## Local Development (VS Code)

### Prerequisites

- Node.js 20 or 24
- pnpm 10 (`npm install -g pnpm`)
- A PostgreSQL database (local or hosted — Neon, Supabase, Render Postgres, etc.)
- A Clerk account (free tier is fine) with Google enabled as a social provider

### Environment variables (create a `.env` file in the project root or export in your shell)

```
DATABASE_URL=postgresql://user:pass@host:5432/channelzz
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
SESSION_SECRET=any-long-random-string
STREAM_SECRET=another-long-random-string
PORT=8080
BASE_PATH=/
```

### Install + run

```bash
pnpm install
pnpm --filter @workspace/db run push           # create tables
pnpm --filter @workspace/api-spec run codegen  # generate API client/zod
# Run API (terminal 1)
PORT=8080 pnpm --filter @workspace/api-server run dev
# Run web (terminal 2)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/channelzz run dev
```

Then open http://localhost:5173 .

> The web dev server expects to call `/api/*` on the same origin. For local dev, add a Vite proxy or run both behind a reverse proxy. Easiest is to set `VITE_API_BASE=http://localhost:8080` and adapt the fetch base in `lib/api-client-react/src/custom-fetch.ts` (or simply deploy — production handles routing automatically).

### Build for production

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
pnpm run build
```

Then start with:

```bash
PORT=8080 pnpm --filter @workspace/api-server run start
```

The frontend builds to `artifacts/channelzz/dist/public/`. You can serve it from the same Express server (recommended in production) or from a CDN.

## Deploy on Render

Create a **Web Service**:

- **Build command:**
  ```
  npm install -g pnpm@10 && pnpm install && pnpm --filter @workspace/api-spec run codegen && pnpm --filter @workspace/db run push && pnpm run build
  ```
- **Start command:**
  ```
  pnpm --filter @workspace/api-server run start
  ```
- **Environment variables:** all of the ones listed above. Use Render's managed Postgres for `DATABASE_URL`.

You'll also want a separate **Static Site** service for `artifacts/channelzz/dist/public/` if you want the frontend hosted on the CDN edge. In that case set the `/api` route to rewrite to the Web Service. Easier path: serve both from the Web Service (add a static-file middleware in `app.ts`).

## Deploy on Vercel

Vercel works best for the frontend. Use:

- **Root directory:** project root
- **Build command:**
  ```
  npm install -g pnpm@10 && pnpm install && pnpm --filter @workspace/api-spec run codegen && pnpm --filter @workspace/channelzz run build
  ```
- **Output directory:** `artifacts/channelzz/dist/public`

Deploy the API separately on Render / Fly / Railway and set `VITE_API_BASE` accordingly.

## Admin

The first user to sign in with `efkidgamer@gmail.com` is automatically promoted to admin and can access `/admin`.

---

Made by a boy from Malawi 🇲🇼
