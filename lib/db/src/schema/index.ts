import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const uuid = () => crypto.randomUUID();

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(uuid),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
  subscriptionEndsAt: integer("subscription_ends_at", { mode: "timestamp_ms" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  lastUserAgent: text("last_user_agent"),
  sessionsCount: integer("sessions_count").notNull().default(0),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: integer("reset_token_expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const categoriesTable = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(uuid),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const channelsTable = sqliteTable("channels", {
  id: text("id").primaryKey().$defaultFn(uuid),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url").notNull(),
  sourceUrl: text("source_url").notNull(),
  /** 'hls' = m3u8 proxied; 'embed' = iframe player URL */
  sourceType: text("source_type").notNull().default("hls"),
  /** Referer header to send when proxying HLS — required by some CDNs */
  sourceReferer: text("source_referer"),
  /** CDN Live TV channel name for sports event matching e.g. "arena sport 2" */
  cdnChannelName: text("cdn_channel_name"),
  /** Pluto TV tvg-id — stable key used for auto-sync upserts */
  plutoTvId: text("pluto_tv_id"),
  /** Pluto TV region: us | uk | ca | de | fr | es | it */
  plutoTvRegion: text("pluto_tv_region"),
  /** Embed page URL used to auto-extract fresh m3u8 tokens (e.g. streamcrichd fetch URL) */
  sourceExtractorUrl: text("source_extractor_url"),
  isLive: integer("is_live", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const announcementsTable = sqliteTable("announcements", {
  id: text("id").primaryKey().$defaultFn(uuid),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const channelRequestsTable = sqliteTable("channel_requests", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  channelName: text("channel_name").notNull(),
  channelUrl: text("channel_url"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  seenByUser: integer("seen_by_user", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  pricingText: text("pricing_text").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  trialMinutes: integer("trial_minutes").notNull().default(30),
});
