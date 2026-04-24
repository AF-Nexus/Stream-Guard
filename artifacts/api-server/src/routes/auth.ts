import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ADMIN_EMAIL,
  bumpSession,
  clearSessionCookie,
  getDefaultTrialMillis,
  issueSessionCookie,
  loadUser,
  readSessionUserId,
  userAccessStatus,
  type AuthedRequest,
} from "../lib/auth.js";

const router: IRouter = Router();

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function meResponse(row: typeof usersTable.$inferSelect) {
  return {
    authenticated: true as const,
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    role: row.role as "admin" | "user",
    banned: row.banned,
    access: userAccessStatus(row),
    trialEndsAt: row.trialEndsAt?.toISOString(),
    subscriptionEndsAt: row.subscriptionEndsAt?.toISOString(),
  };
}

router.post("/auth/signup", async (req: Request, res: Response) => {
  const body = req.body as { email?: unknown; password?: unknown; name?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!isValidEmail(email)) { res.status(400).json({ error: "Invalid email" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) { res.status(409).json({ error: "An account with that email already exists" }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = email === ADMIN_EMAIL ? "admin" : "user";
  const trialMs = await getDefaultTrialMillis();
  const trialEndsAt = role === "admin" ? null : new Date(Date.now() + trialMs);
  const ua = (req.headers["user-agent"] as string | undefined) ?? null;

  const [row] = await db.insert(usersTable).values({
    email,
    passwordHash,
    name: name && name.length ? name : null,
    role,
    trialEndsAt,
    lastSeenAt: new Date(),
    lastUserAgent: ua,
    sessionsCount: 1,
  }).returning();

  if (!row) { res.status(500).json({ error: "Failed to create account" }); return; }

  issueSessionCookie(res, row.id);
  res.json(meResponse(row));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const body = req.body as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }

  const [row] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!row) { res.status(401).json({ error: "Invalid email or password" }); return; }

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) { res.status(401).json({ error: "Invalid email or password" }); return; }

  // If this email is the admin email and the row isn't admin yet, promote.
  if (email === ADMIN_EMAIL && row.role !== "admin") {
    await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, row.id));
    row.role = "admin";
  }

  const refreshed = (await bumpSession(row.id, req)) ?? row;
  issueSessionCookie(res, row.id);
  res.json(meResponse(refreshed));
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", async (req: AuthedRequest, res: Response) => {
  const userId = readSessionUserId(req);
  if (!userId) { res.json({ authenticated: false }); return; }
  const row = await loadUser(userId);
  if (!row) { clearSessionCookie(res); res.json({ authenticated: false }); return; }
  res.json(meResponse(row));
});

export default router;
