import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"), // 'admin' | 'user'
  banned: boolean("banned").notNull().default(false),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  lastUserAgent: text("last_user_agent"),
  sessionsCount: integer("sessions_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelsTable = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url").notNull(),
  sourceUrl: text("source_url").notNull(), // m3u8 origin — never returned to clients
  isLive: boolean("is_live").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcementsTable = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const settingsTable = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  pricingText: text("pricing_text").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  trialHours: integer("trial_hours").notNull().default(4),
});
