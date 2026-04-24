# Channelzz

A self-contained live TV streaming platform with email/password auth and a built-in admin portal. No third-party services required.

## Features

- Email + password sign-up / sign-in (no SaaS dependency)
- The first user to sign up with `efkidgamer@gmail.com` is automatically promoted to admin
- Dark / light theme switcher
- Admin portal: manage channels (m3u8), categories, users, subscriptions, announcements (auto-expire after 24h), pricing
- 4-hour free trial for new users (configurable in admin settings)
- Subscription days, ban users, real-time tracking with user-agent and session count
- **Stream proxy**: m3u8 origin URLs are NEVER exposed to the browser. Every request is signed with a short-lived JWT and proxied through the backend
- WhatsApp upgrade flow (number editable in admin settings)

## Tech Stack

- **Backend:** Node 20 / Express 5 / better-sqlite3 / Drizzle ORM
- **Frontend:** React + Vite + Tailwind + shadcn/ui + wouter + TanStack Query
- **Auth:** bcryptjs + JWT in an httpOnly cookie
- **Database:** SQLite (single file). Tables are created automatically on first boot.

## Local development

### Prerequisites

- Node.js 20 or 24
- pnpm 10 (`npm install -g pnpm`)

### Environment variables

Create a `.env` file in the project root, or export in your shell:

```
SESSION_SECRET=any-long-random-string
STREAM_SECRET=another-long-random-string
DATABASE_PATH=./data/channelzz.db   # optional, default shown
PORT=8080
BASE_PATH=/
```

### Install + run

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
# Run API (terminal 1)
PORT=8080 pnpm --filter @workspace/api-server run dev
# Run web (terminal 2)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/channelzz run dev
```

Then open http://localhost:5173 .

### Build for production

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm run build
```

Then start with:

```bash
PORT=8080 pnpm --filter @workspace/api-server run start
```

The frontend builds to `artifacts/channelzz/dist/public/`.

## Deploy on Render (recommended)

The API server and the SQLite file should live on a service with a **persistent disk**, otherwise your data will be wiped on every redeploy.

1. Create a **Web Service** from this repo.
2. **Build command:**
   ```
   npm install -g pnpm@10 && pnpm install && pnpm --filter @workspace/api-spec run codegen && pnpm run build
   ```
3. **Start command:**
   ```
   pnpm --filter @workspace/api-server run start
   ```
4. **Environment variables:**
   - `SESSION_SECRET` — long random string
   - `STREAM_SECRET` — long random string
   - `DATABASE_PATH=/var/data/channelzz.db`
   - `NODE_ENV=production`
5. Add a **Disk**:
   - Mount path: `/var/data`
   - Size: 1 GB is more than enough.

That's it — no external database, no third-party auth provider, nothing else to configure. The first time you visit the app, sign up with `efkidgamer@gmail.com` and you'll be promoted to admin automatically.

If you want to host the static frontend on a CDN separately (Vercel/Netlify), build it with:

```
pnpm install && pnpm --filter @workspace/api-spec run codegen && pnpm --filter @workspace/channelzz run build
```

…and serve `artifacts/channelzz/dist/public/`. You'll need to set `VITE_API_BASE` (or proxy `/api/*` to your Render API service) so the frontend talks to the right backend.

## Admin

After deploying:

1. Go to the app and click **Sign in → Create one**.
2. Sign up with `efkidgamer@gmail.com`. You'll land on `/admin` automatically.
3. Add categories, then add channels (paste your m3u8 source URL — it will be kept secret server-side and proxied through `/api/stream/...`).
4. Tweak pricing text, WhatsApp number, and trial hours from the **Settings** tab.

---

Made by a boy from Malawi 🇲🇼
