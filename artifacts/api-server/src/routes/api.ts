import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, categoriesTable, channelsTable, announcementsTable, settingsTable, channelRequestsTable } from "@workspace/db";
import { eq, desc, sql, and, gt, lt } from "drizzle-orm";
import { requireAuth, requireAdmin, userAccessStatus, userHasAccess, type AuthedRequest } from "../lib/auth.js";
import { signStreamToken } from "../lib/streamToken.js";
import streamRouter from "./stream.js";

const router: IRouter = Router();

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `cat-${Date.now()}`;
}

function serializeChannel(c: typeof channelsTable.$inferSelect, categoryName: string) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    categoryId: c.categoryId,
    categoryName,
    logoUrl: c.logoUrl,
    isLive: c.isLive,
    createdAt: c.createdAt.toISOString(),
  };
}

// --- Stream proxy (no auth — token-based) ---
router.use("/stream", streamRouter);

// --- Public ---
router.get("/categories", async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, createdAt: r.createdAt.toISOString() })));
});

router.get("/announcements", async (_req, res) => {
  // auto-cleanup expired
  await db.delete(announcementsTable).where(lt(announcementsTable.expiresAt, new Date()));
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id, title: r.title, body: r.body,
    createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(),
  })));
});

router.get("/settings", async (_req, res) => {
  const [s] = await db.select().from(settingsTable).limit(1);
  if (!s) {
    res.json({ pricingText: "Contact admin for pricing.", whatsappNumber: "265993702468", trialMinutes: 30 });
    return;
  }
  res.json({ pricingText: s.pricingText, whatsappNumber: s.whatsappNumber, trialMinutes: s.trialMinutes });
});

router.get("/channels", async (_req, res) => {
  const rows = await db
    .select({
      id: channelsTable.id,
      name: channelsTable.name,
      description: channelsTable.description,
      categoryId: channelsTable.categoryId,
      categoryName: categoriesTable.name,
      logoUrl: channelsTable.logoUrl,
      isLive: channelsTable.isLive,
      createdAt: channelsTable.createdAt,
    })
    .from(channelsTable)
    .innerJoin(categoriesTable, eq(channelsTable.categoryId, categoriesTable.id))
    .orderBy(channelsTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), description: r.description ?? undefined })));
});

router.get("/channels/:id", async (req, res) => {
  const id = String(req.params.id);
  const [r] = await db
    .select({
      id: channelsTable.id,
      name: channelsTable.name,
      description: channelsTable.description,
      categoryId: channelsTable.categoryId,
      categoryName: categoriesTable.name,
      logoUrl: channelsTable.logoUrl,
      isLive: channelsTable.isLive,
      createdAt: channelsTable.createdAt,
    })
    .from(channelsTable)
    .innerJoin(categoriesTable, eq(channelsTable.categoryId, categoriesTable.id))
    .where(eq(channelsTable.id, id))
    .limit(1);
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...r, createdAt: r.createdAt.toISOString(), description: r.description ?? undefined });
});

// --- Authenticated ---
router.post("/channels/:id/play", requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const row = req.userRow!;
  if (!userHasAccess(row)) { res.status(403).json({ error: "No active subscription" }); return; }
  const [c] = await db.select().from(channelsTable).where(eq(channelsTable.id, id)).limit(1);
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const ttl = 60 * 60; // 1 hour
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  if (c.sourceType === "embed") {
    // Embed channels: return the URL directly (it's a public player page, not a secret stream)
    res.json({ type: "embed", embedUrl: c.sourceUrl, expiresAt });
    return;
  }

  // Default: HLS m3u8 proxied through stream router
  const token = signStreamToken({ cid: c.id, uid: row.id }, ttl);
  const playlistUrl = `/api/stream/p/${token}/index.m3u8`;
  res.json({ type: "hls", playlistUrl, expiresAt });
});

// --- Channel Requests (user) ---
router.post("/channel-requests", requireAuth, async (req: AuthedRequest, res: Response) => {
  const b = req.body as { channelName?: string; channelUrl?: string; notes?: string };
  if (!b.channelName?.trim()) { res.status(400).json({ error: "channelName required" }); return; }
  const [r] = await db.insert(channelRequestsTable).values({
    userId: req.userRow!.id,
    channelName: b.channelName.trim(),
    channelUrl: b.channelUrl?.trim() || null,
    notes: b.notes?.trim() || null,
  }).returning();
  res.json(r);
});

router.get("/channel-requests/mine", requireAuth, async (req: AuthedRequest, res: Response) => {
  const rows = await db.select().from(channelRequestsTable)
    .where(eq(channelRequestsTable.userId, req.userRow!.id))
    .orderBy(desc(channelRequestsTable.createdAt));
  // Mark all as seen after reading
  await db.update(channelRequestsTable)
    .set({ seenByUser: true })
    .where(eq(channelRequestsTable.userId, req.userRow!.id));
  res.json(rows);
});

router.get("/channel-requests/mine/unseen", requireAuth, async (req: AuthedRequest, res: Response) => {
  const rows = await db.select().from(channelRequestsTable)
    .where(and(
      eq(channelRequestsTable.userId, req.userRow!.id),
      eq(channelRequestsTable.seenByUser, false),
    ));
  // Only return ones that have been actioned (not still pending)
  const actioned = rows.filter(r => r.status !== "pending");
  res.json(actioned);
});

// --- Channel Requests (admin) ---
router.get("/admin/channel-requests", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: channelRequestsTable.id,
      channelName: channelRequestsTable.channelName,
      channelUrl: channelRequestsTable.channelUrl,
      notes: channelRequestsTable.notes,
      status: channelRequestsTable.status,
      adminNote: channelRequestsTable.adminNote,
      createdAt: channelRequestsTable.createdAt,
      userId: channelRequestsTable.userId,
      userEmail: usersTable.email,
      userName: usersTable.name,
    })
    .from(channelRequestsTable)
    .innerJoin(usersTable, eq(channelRequestsTable.userId, usersTable.id))
    .orderBy(desc(channelRequestsTable.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.patch("/admin/channel-requests/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const b = req.body as { status?: "approved" | "rejected"; adminNote?: string };
  if (!b.status) { res.status(400).json({ error: "status required" }); return; }
  const [r] = await db.update(channelRequestsTable)
    .set({ status: b.status, adminNote: b.adminNote?.trim() || null, seenByUser: false })
    .where(eq(channelRequestsTable.id, id))
    .returning();
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...r, createdAt: r.createdAt.toISOString() });
});

router.delete("/admin/channel-requests/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(channelRequestsTable).where(eq(channelRequestsTable.id, String(req.params.id)));
  res.json({ ok: true });
});

// --- Admin ---
router.post("/categories", requireAuth, requireAdmin, async (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const slug = slugify(name);
  const [r] = await db.insert(categoriesTable).values({ name, slug }).returning();
  res.json({ id: r!.id, name: r!.name, slug: r!.slug, createdAt: r!.createdAt.toISOString() });
});

router.delete("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(categoriesTable).where(eq(categoriesTable.id, String(req.params.id)));
  res.json({ ok: true });
});

router.post("/channels", requireAuth, requireAdmin, async (req, res) => {
  const b = req.body as { name?: string; description?: string; categoryId?: string; logoUrl?: string; sourceUrl?: string; sourceType?: string; sourceReferer?: string; cdnChannelName?: string; isLive?: boolean };
  if (!b.name || !b.categoryId || !b.logoUrl || !b.sourceUrl) { res.status(400).json({ error: "Missing fields" }); return; }
  const sourceType = b.sourceType === "embed" ? "embed" : "hls";
  const [c] = await db.insert(channelsTable).values({
    name: b.name, description: b.description ?? null, categoryId: b.categoryId,
    logoUrl: b.logoUrl, sourceUrl: b.sourceUrl, sourceType,
    sourceReferer: b.sourceReferer ?? null,
    cdnChannelName: b.cdnChannelName ? b.cdnChannelName.toLowerCase().trim() : null,
    isLive: b.isLive ?? true,
  }).returning();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, c!.categoryId)).limit(1);
  res.json(serializeChannel(c!, cat?.name ?? ""));
});

router.patch("/channels/:id", requireAuth, requireAdmin, async (req, res) => {
  const b = req.body as Partial<{ name: string; description: string; categoryId: string; logoUrl: string; sourceUrl: string; sourceType: string; sourceReferer: string; cdnChannelName: string; isLive: boolean }>;
  const update: Record<string, unknown> = {};
  if (b.name !== undefined) update.name = b.name;
  if (b.description !== undefined) update.description = b.description;
  if (b.categoryId !== undefined) update.categoryId = b.categoryId;
  if (b.logoUrl !== undefined) update.logoUrl = b.logoUrl;
  if (b.sourceUrl !== undefined && b.sourceUrl !== "") update.sourceUrl = b.sourceUrl;
  if (b.sourceType !== undefined) update.sourceType = b.sourceType === "embed" ? "embed" : "hls";
  if (b.sourceReferer !== undefined) update.sourceReferer = b.sourceReferer || null;
  if (b.cdnChannelName !== undefined) update.cdnChannelName = b.cdnChannelName ? b.cdnChannelName.toLowerCase().trim() : null;
  if (b.isLive !== undefined) update.isLive = b.isLive;
  const [c] = await db.update(channelsTable).set(update).where(eq(channelsTable.id, String(req.params.id))).returning();
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, c.categoryId)).limit(1);
  res.json(serializeChannel(c, cat?.name ?? ""));
});

router.delete("/channels/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(channelsTable).where(eq(channelsTable.id, String(req.params.id)));
  res.json({ ok: true });
});

router.post("/announcements", requireAuth, requireAdmin, async (req, res) => {
  const b = req.body as { title?: string; body?: string };
  if (!b.title || !b.body) { res.status(400).json({ error: "Missing fields" }); return; }
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  const [a] = await db.insert(announcementsTable).values({ title: b.title, body: b.body, expiresAt }).returning();
  res.json({ id: a!.id, title: a!.title, body: a!.body, createdAt: a!.createdAt.toISOString(), expiresAt: a!.expiresAt.toISOString() });
});

router.delete("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(announcementsTable).where(eq(announcementsTable.id, String(req.params.id)));
  res.json({ ok: true });
});

router.put("/settings", requireAuth, requireAdmin, async (req, res) => {
  const b = req.body as { pricingText?: string; whatsappNumber?: string; trialMinutes?: number };
  if (!b.pricingText || !b.whatsappNumber || b.trialMinutes === undefined) { res.status(400).json({ error: "Missing fields" }); return; }
  const [s] = await db
    .insert(settingsTable)
    .values({ id: 1, pricingText: b.pricingText, whatsappNumber: b.whatsappNumber, trialMinutes: b.trialMinutes })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { pricingText: b.pricingText, whatsappNumber: b.whatsappNumber, trialMinutes: b.trialMinutes },
    })
    .returning();
  res.json({ pricingText: s!.pricingText, whatsappNumber: s!.whatsappNumber, trialMinutes: s!.trialMinutes });
});

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id, email: r.email,
    name: r.name ?? null, avatarUrl: r.avatarUrl ?? null,
    role: r.role as "admin" | "user",
    access: userAccessStatus(r),
    banned: r.banned,
    trialEndsAt: r.trialEndsAt ? r.trialEndsAt.toISOString() : null,
    subscriptionEndsAt: r.subscriptionEndsAt ? r.subscriptionEndsAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null,
    lastUserAgent: r.lastUserAgent ?? null,
    sessionsCount: r.sessionsCount,
    resetToken: r.resetToken ?? null,
    resetTokenExpiresAt: r.resetTokenExpiresAt ? r.resetTokenExpiresAt.toISOString() : null,
  })));
});

// Generate a password reset token for a user (admin action)
router.post("/admin/users/:id/reset-token", requireAuth, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const token = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.update(usersTable).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(usersTable.id, id));
  res.json({ token, expiresAt: expiresAt.toISOString() });
});

router.patch("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const b = req.body as { addDays?: number; addHours?: number; addMinutes?: number; setSubscriptionEndsAt?: string | null; banned?: boolean };
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const update: Record<string, unknown> = {};

  // Custom duration: addDays, addHours, addMinutes all supported
  const totalMs =
    (typeof b.addDays === "number" ? b.addDays * 86400 * 1000 : 0) +
    (typeof b.addHours === "number" ? b.addHours * 3600 * 1000 : 0) +
    (typeof b.addMinutes === "number" ? b.addMinutes * 60 * 1000 : 0);

  if (totalMs > 0) {
    const base = existing.subscriptionEndsAt && existing.subscriptionEndsAt.getTime() > Date.now()
      ? existing.subscriptionEndsAt.getTime() : Date.now();
    update.subscriptionEndsAt = new Date(base + totalMs);
  }
  if (b.setSubscriptionEndsAt !== undefined) {
    update.subscriptionEndsAt = b.setSubscriptionEndsAt ? new Date(b.setSubscriptionEndsAt) : null;
  }
  if (typeof b.banned === "boolean") update.banned = b.banned;
  const [r] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
  res.json({
    id: r!.id, email: r!.email, name: r!.name ?? null, avatarUrl: r!.avatarUrl ?? null,
    role: r!.role as "admin" | "user",
    access: userAccessStatus(r!),
    banned: r!.banned,
    trialEndsAt: r!.trialEndsAt ? r!.trialEndsAt.toISOString() : null,
    subscriptionEndsAt: r!.subscriptionEndsAt ? r!.subscriptionEndsAt.toISOString() : null,
    createdAt: r!.createdAt.toISOString(),
    lastSeenAt: r!.lastSeenAt ? r!.lastSeenAt.toISOString() : null,
    lastUserAgent: r!.lastUserAgent ?? null,
    sessionsCount: r!.sessionsCount,
  });
});

router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res) => {
  const totalUsersR = await db.select({ c: sql<number>`count(*)` }).from(usersTable);
  const bannedR = await db.select({ c: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.banned, true));
  const paidR = await db.select({ c: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.banned, false), gt(usersTable.subscriptionEndsAt, new Date())));
  const trialR = await db.select({ c: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.banned, false), gt(usersTable.trialEndsAt, new Date())));
  const channelsR = await db.select({ c: sql<number>`count(*)` }).from(channelsTable);
  const catsR = await db.select({ c: sql<number>`count(*)` }).from(categoriesTable);
  const recent = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(8);
  const totalUsers = totalUsersR[0]?.c ?? 0;
  const banned = bannedR[0]?.c ?? 0;
  const paid = paidR[0]?.c ?? 0;
  const trial = trialR[0]?.c ?? 0;
  res.json({
    totalUsers,
    activeUsers: paid + trial,
    paidUsers: paid,
    trialUsers: trial,
    bannedUsers: banned,
    totalChannels: channelsR[0]?.c ?? 0,
    totalCategories: catsR[0]?.c ?? 0,
    recentSignups: recent.map(u => ({ id: u.id, email: u.email, name: u.name ?? null, createdAt: u.createdAt.toISOString() })),
  });
});

// ── Sports API proxy ─────────────────────────────────────────────────────────
router.get("/sports", requireAuth, async (_req, res) => {
  try {
    const r = await fetch("https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free", {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { res.status(502).json({ error: `Upstream ${r.status}` }); return; }
    const data = await r.json();
    res.json(data);
  } catch { res.status(502).json({ error: "Failed to reach sports API" }); }
});

// ── Sports channel resolve — checks if we have a custom HLS stream for a CDN channel ─────
router.get("/sports/resolve", requireAuth, async (req, res) => {
  const name = String(req.query.name ?? "").toLowerCase().trim();
  if (!name) { res.json({ channelId: null }); return; }
  const { like } = await import("drizzle-orm");
  const rows = await db.select().from(channelsTable)
    .where(like(channelsTable.cdnChannelName, name))
    .limit(1);
  res.json({ channelId: rows[0]?.id ?? null });
});

// ── Stream tester ─────────────────────────────────────────────────────────────
router.get("/admin/test-stream", requireAuth, requireAdmin, async (req, res) => {
  const url = String(req.query.url ?? "");
  const type = String(req.query.type ?? "hls");
  if (!url) { res.status(400).json({ ok: false, error: "Missing url" }); return; }
  try {
    const r = await fetch(url, {
      method: type === "hls" ? "GET" : "HEAD",
      headers: { "User-Agent": "Mozilla/5.0", "Referer": new URL(url).origin + "/" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    // HLS: also check it starts with #EXTM3U
    if (type === "hls") {
      const text = await r.text();
      res.json({ ok: r.ok && (text.startsWith("#EXTM3U") || text.startsWith("#EXT")) });
    } else {
      res.json({ ok: r.status < 400 });
    }
  } catch {
    res.json({ ok: false });
  }
});

// ── M3U playlist proxy (avoids browser CORS) ─────────────────────────────────
router.get("/admin/fetch-m3u", requireAuth, requireAdmin, async (req, res) => {
  const url = String(req.query.url ?? "");
  if (!url) { res.status(400).send("Missing url"); return; }
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) { res.status(502).send(`Upstream ${r.status}`); return; }
    const text = await r.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (e: any) {
    res.status(502).send(e.message ?? "Fetch failed");
  }
});

// ── Pluto TV Sync Engine ──────────────────────────────────────────────────────

const PLUTO_REGIONS = ["us", "uk", "ca", "de", "fr", "es", "it"] as const;
type PlutoRegion = typeof PLUTO_REGIONS[number];

// The ONLY 7 categories that will ever exist from Pluto TV
const FIXED_CATEGORIES = ["Movies", "Sports", "News", "Entertainment", "Kids", "Music", "Random"] as const;

const PLUTO_CATEGORY_MAP: Record<string, string> = {
  "movies": "Movies", "action movies": "Movies", "horror movies": "Movies",
  "comedy movies": "Movies", "drama movies": "Movies", "thriller movies": "Movies",
  "sci-fi movies": "Movies", "romance movies": "Movies", "animated movies": "Movies",
  "family movies": "Movies", "western movies": "Movies", "documentary movies": "Movies",
  "classic movies": "Movies", "indie movies": "Movies", "crime movies": "Movies",
  "anime": "Movies",
  "sports": "Sports", "sports & fitness": "Sports", "football": "Sports",
  "soccer": "Sports", "basketball": "Sports", "combat sports": "Sports",
  "news": "News", "news & opinion": "News", "world news": "News",
  "business news": "News", "weather": "News",
  "entertainment": "Entertainment", "reality & docs": "Entertainment",
  "reality tv": "Entertainment", "talk shows": "Entertainment",
  "game shows": "Entertainment", "comedy": "Entertainment", "drama": "Entertainment",
  "documentaries": "Entertainment", "true crime": "Entertainment",
  "science": "Entertainment", "nature": "Entertainment",
  "arts & culture": "Entertainment", "lifestyle": "Entertainment",
  "food": "Entertainment", "travel": "Entertainment", "technology": "Entertainment",
  "music": "Music", "music videos": "Music", "radio": "Music",
  "kids": "Kids", "kids & family": "Kids", "cartoons": "Kids",
};

function mapPlutoGroup(group: string): string {
  return PLUTO_CATEGORY_MAP[group.toLowerCase().trim()] ?? "Random";
}

function plutoRawUrl(region: PlutoRegion, githubUser = "AF-Nexus") {
  return `https://raw.githubusercontent.com/${githubUser}/Pluto-TV-Playlists/main/output/plutotv_${region}.m3u8`;
}

function parsePlutoM3U(text: string) {
  const lines = text.split(/\r?\n/);
  const results: { plutoTvId: string; name: string; logo: string; group: string; url: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXTINF")) continue;
    const url = lines[i + 1]?.trim();
    if (!url || url.startsWith("#")) continue;
    const tvgId = line.match(/tvg-id="([^"]+)"/)?.[1] ?? "";
    const logo  = line.match(/tvg-logo="([^"]+)"/)?.[1] ?? "";
    const group = line.match(/group-title="([^"]+)"/)?.[1]?.trim() ?? "";
    const name  = line.match(/,(.+)$/)?.[1]?.trim() ?? "Unknown";
    if (!tvgId || !url) continue;
    results.push({ plutoTvId: tvgId, name, logo, group: mapPlutoGroup(group), url });
  }
  return results;
}

// Seed the 7 fixed categories — idempotent, safe to call anytime
async function ensureFixedCategories() {
  const catMap = new Map<string, string>(); // name → id
  for (const name of FIXED_CATEGORIES) {
    const slug = name.toLowerCase();
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, slug)).limit(1);
    if (existing[0]) {
      catMap.set(name, existing[0].id);
    } else {
      const [c] = await db.insert(categoriesTable).values({ name, slug }).returning();
      catMap.set(name, c!.id);
    }
  }
  return catMap;
}

// Core sync — US or UK only, fixed categories, no auto-creation
async function runPlutoSync(region: PlutoRegion, githubUser = "AF-Nexus") {
  const rawUrl = plutoRawUrl(region, githubUser);
  const r = await fetch(rawUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/plain" },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`GitHub returned ${r.status} for ${rawUrl}`);
  const text = await r.text();
  const channels = parsePlutoM3U(text);
  if (channels.length === 0) throw new Error("Parsed 0 channels — aborting to avoid wiping data");

  // Load category map — only ever 7 fixed ones
  const catMap = await ensureFixedCategories();

  let added = 0, updated = 0;
  const seenIds = new Set<string>();

  for (const ch of channels) {
    seenIds.add(ch.plutoTvId);
    const categoryId = catMap.get(ch.group) ?? catMap.get("Random")!;

    // Match by plutoTvId
    const existing = await db.select({ id: channelsTable.id })
      .from(channelsTable).where(eq(channelsTable.plutoTvId, ch.plutoTvId)).limit(1);

    if (existing[0]) {
      await db.update(channelsTable).set({
        name: ch.name, logoUrl: ch.logo, sourceUrl: ch.url,
        categoryId, sourceReferer: "https://pluto.tv/", plutoTvRegion: region,
      }).where(eq(channelsTable.id, existing[0].id));
      updated++;
    } else {
      await db.insert(channelsTable).values({
        name: ch.name, logoUrl: ch.logo, sourceUrl: ch.url, categoryId,
        sourceType: "hls", sourceReferer: "https://pluto.tv/",
        plutoTvId: ch.plutoTvId, plutoTvRegion: region, isLive: true,
      });
      added++;
    }
  }

  // Remove channels from this region no longer in playlist
  const regionRows = await db.select({ id: channelsTable.id, plutoTvId: channelsTable.plutoTvId })
    .from(channelsTable).where(eq(channelsTable.plutoTvRegion, region));
  let removed = 0;
  for (const row of regionRows) {
    if (row.plutoTvId && !seenIds.has(row.plutoTvId)) {
      await db.delete(channelsTable).where(eq(channelsTable.id, row.id));
      removed++;
    }
  }

  return { added, updated, removed, total: channels.length };
}

// ── NUCLEAR RESET — wipes ALL Pluto channels + ALL categories, seeds 7 clean ones ──
router.post("/admin/pluto/reset", requireAuth, requireAdmin, async (_req, res) => {
  // Delete every channel that came from Pluto TV
  await db.delete(channelsTable).where(sql`${channelsTable.plutoTvId} IS NOT NULL`);
  // Wipe all categories
  await db.delete(categoriesTable);
  // Seed the 7 fixed ones
  const catMap = await ensureFixedCategories();
  res.json({ ok: true, categories: [...catMap.keys()], message: "Reset done. Now sync US + UK." });
});

// ── Manual sync — single region ───────────────────────────────────────────────
router.post("/admin/pluto/sync", requireAuth, requireAdmin, async (req, res) => {
  const region = String(req.query.region ?? "us").toLowerCase() as PlutoRegion;
  const githubUser = String(req.query.githubUser ?? "AF-Nexus");
  if (!PLUTO_REGIONS.includes(region)) {
    res.status(400).json({ error: `Unknown region. Use: ${PLUTO_REGIONS.join(", ")}` }); return;
  }
  try {
    const result = await runPlutoSync(region, githubUser);
    res.json({ ok: true, region, ...result });
  } catch (e: any) {
    res.status(502).json({ error: e.message ?? "Sync failed" });
  }
});

// ── Sync US + UK — the main button ───────────────────────────────────────────
router.post("/admin/pluto/sync-uk-us", requireAuth, requireAdmin, async (req, res) => {
  const githubUser = String(req.query.githubUser ?? "AF-Nexus");
  const results: Record<string, unknown> = {};
  for (const region of ["us", "uk"] as PlutoRegion[]) {
    try { results[region] = await runPlutoSync(region, githubUser); }
    catch (e: any) { results[region] = { error: e.message }; }
  }
  res.json({ ok: true, results });
});

// ── Webhook — called by GitHub Actions automatically after every push ─────────
router.post("/webhooks/pluto", async (req, res) => {
  const secret = process.env.PLUTO_SYNC_SECRET;
  if (secret) {
    const provided = req.headers["x-sync-secret"] ?? req.query.secret;
    if (provided !== secret) { res.status(401).json({ error: "Unauthorized" }); return; }
  }
  const githubUser = String(req.query.githubUser ?? "AF-Nexus");
  res.json({ ok: true, status: "sync started", regions: ["us", "uk"] });
  // Fire-and-forget — always US + UK only
  (async () => {
    for (const region of ["us", "uk"] as PlutoRegion[]) {
      try {
        const r = await runPlutoSync(region, githubUser);
        console.log(`[pluto-webhook] ${region}:`, r);
      } catch (e) {
        console.error(`[pluto-webhook] ${region} failed:`, e);
      }
    }
  })();
});

// ── Embed proxy — fetches third-party player page, strips ads + chat, returns clean HTML ──
router.get("/proxy/embed", requireAuth, async (req: AuthedRequest, res: Response) => {
  const raw = req.query.url as string | undefined;
  if (!raw) { res.status(400).send("Missing url"); return; }

  let targetUrl: string;
  try {
    targetUrl = Buffer.from(raw, "base64url").toString("utf8");
    new URL(targetUrl); // validate
  } catch { res.status(400).send("Invalid url"); return; }

  let html: string;
  try {
    const r = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": new URL(targetUrl).origin + "/",
        "Origin": new URL(targetUrl).origin,
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!r.ok) { res.status(502).send(`Upstream returned ${r.status}`); return; }
    html = await r.text();
  } catch (e: any) {
    res.status(502).send(`Fetch failed: ${e.message}`);
    return;
  }

  const origin = new URL(targetUrl).origin;

  // Injected at the very top of <head> — runs before any page scripts
  const headInjection = `
<base href="${origin}/">
<style>
  /* ── Reset ── */
  html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#000!important;width:100%!important;height:100%!important;}

  /* ── Hide ads ── */
  .ad,.ads,.advert,.advertisement,.adsense,.ad-unit,.ad-slot,.ad-banner,
  [id^="ad"],[id*="-ad"],[id*="_ad"],[id*="AdSlot"],[id*="adSlot"],
  [class^="ad-"],[class*="-ad-"],[class*="_ad_"],[class*="banner-ad"],
  ins.adsbygoogle,.dfp-ad,.gpt-ad,.pub-ad,
  [id*="google_ads"],[id*="div-gpt"],[id*="dfp"],[id*="adsense"],
  [data-ad],[data-ad-unit],[data-adunit],
  /* ── Hide chat/social sidebars ── */
  .chat,.livechat,.chat-box,.chat-container,.chat-wrapper,.chat-panel,
  [id*="chat"],[class*="chat"],[id*="Chat"],[class*="Chat"],
  .sidebar,.social,.comments,.comment-box,[class*="sidebar"],
  /* ── Hide popups/overlays ── */
  .popup,.modal,.overlay-ad,.ad-overlay,.toast,
  [id*="popup"],[id*="modal"],[class*="popup"],
  /* ── Hide page nav/header/footer (keep player controls) ── */
  body>header,body>nav,body>footer,
  .site-header,.site-footer,.page-header,.page-footer,
  .navbar,.topbar,.bottombar,
  /* ── Ad network iframes ── */
  iframe[src*="doubleclick"],iframe[src*="googlesyndication"],
  iframe[src*="adnxs"],iframe[src*="moatads"],
  iframe[src*="amazon-adsystem"],iframe[src*="openx"],
  iframe[src*="pubmatic"],iframe[src*="rubiconproject"],
  iframe[src*="taboola"],iframe[src*="outbrain"],
  iframe[src*="ads."],iframe[src*=".ads."] {
    display:none!important;
    visibility:hidden!important;
    opacity:0!important;
    pointer-events:none!important;
    width:0!important;height:0!important;
  }

  /* ── Make video + player fill the view ── */
  video{width:100%!important;height:100%!important;max-width:100%!important;object-fit:contain;background:#000;}
  .player,.video-player,.player-wrapper,.video-wrapper,
  [class*="player"],[id*="player"],
  [class*="video-container"],[id*="video-container"] {
    width:100%!important;height:100%!important;max-width:100%!important;
  }
</style>
<script>
  // Block popup windows
  window.open = () => null;

  // Stub common ad libraries before they load
  window.googletag = { cmd: { push: f => { try { f(); } catch {} } }, defineSlot: () => ({ addService: () => ({}) }), pubads: () => ({ enableSingleRequest: () => {}, refresh: () => {}, addEventListener: () => {} }), enableServices: () => {}, display: () => {} };
  window.adsbygoogle = [];
  Object.defineProperty(window, 'adsbygoogle', { get: () => [], set: () => {} });
  window.__tcfapi = () => {};
  window._gaq = [];

  // Remove ad iframes that load after DOMContentLoaded
  const adSelectors = 'iframe[src*="doubleclick"],iframe[src*="googlesyndication"],iframe[src*="adnxs"],iframe[src*="amazon-adsystem"],iframe[src*="taboola"],iframe[src*="outbrain"],.ad,.ads,[id^="ad"],[class*="banner-ad"]';
  const purgeAds = () => document.querySelectorAll(adSelectors).forEach(el => el.remove());
  document.addEventListener('DOMContentLoaded', purgeAds);
  setInterval(purgeAds, 800);
</script>`;

  // Inject into <head> if it exists, otherwise prepend
  if (html.includes("<head>")) {
    html = html.replace("<head>", "<head>" + headInjection);
  } else if (html.includes("<HEAD>")) {
    html = html.replace("<HEAD>", "<HEAD>" + headInjection);
  } else {
    html = headInjection + html;
  }

  // Strip X-Frame-Options from the proxied response so it can be embedded
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Content-Security-Policy");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

export default router;
