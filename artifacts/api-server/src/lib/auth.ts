import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "efkidgamer@gmail.com";

export interface AuthedRequest extends Request {
  userId?: string;
  userRow?: typeof usersTable.$inferSelect;
}

async function ensureUserRow(clerkUserId: string, req: Request) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, clerkUserId))
    .limit(1);

  const ua = (req.headers["user-agent"] as string | undefined) ?? null;

  if (existing.length === 0) {
    let email = "";
    let name: string | null = null;
    let avatarUrl: string | null = null;
    try {
      const u = await clerkClient.users.getUser(clerkUserId);
      email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
      name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null;
      avatarUrl = u.imageUrl ?? null;
    } catch {
      // ignore
    }

    const role = email.toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
    const settingsRows = await db.select().from(settingsTable).limit(1);
    const trialHours = settingsRows[0]?.trialHours ?? 4;

    const trialEndsAt = new Date(Date.now() + trialHours * 3600 * 1000);

    const [row] = await db
      .insert(usersTable)
      .values({
        id: clerkUserId,
        email: email || `${clerkUserId}@unknown.local`,
        name,
        avatarUrl,
        role,
        trialEndsAt: role === "admin" ? null : trialEndsAt,
        lastSeenAt: new Date(),
        lastUserAgent: ua,
        sessionsCount: 1,
      })
      .returning();
    return row;
  } else {
    const [row] = await db
      .update(usersTable)
      .set({
        lastSeenAt: new Date(),
        lastUserAgent: ua,
        sessionsCount: (existing[0]!.sessionsCount ?? 0) + 1,
      })
      .where(eq(usersTable.id, clerkUserId))
      .returning();
    return row;
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims as { userId?: string } | undefined)?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const row = await ensureUserRow(userId, req);
    req.userId = userId;
    req.userRow = row ?? undefined;
    next();
  } catch (err) {
    req.log?.error({ err }, "ensureUserRow failed");
    res.status(500).json({ error: "Auth bootstrap failed" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRow?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function userAccessStatus(row: typeof usersTable.$inferSelect): "trial" | "paid" | "expired" | "banned" {
  if (row.banned) return "banned";
  const now = Date.now();
  if (row.subscriptionEndsAt && row.subscriptionEndsAt.getTime() > now) return "paid";
  if (row.trialEndsAt && row.trialEndsAt.getTime() > now) return "trial";
  return "expired";
}

export function userHasAccess(row: typeof usersTable.$inferSelect): boolean {
  if (row.role === "admin") return true;
  const s = userAccessStatus(row);
  return s === "trial" || s === "paid";
}
