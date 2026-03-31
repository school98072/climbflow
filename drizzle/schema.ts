import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Enums
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User profile extension
 */
export const userProfiles = pgTable("userProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  climbingLevel: varchar("climbingLevel", { length: 50 }),
  favoriteGradeSystem: varchar("favoriteGradeSystem", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Routes table
 */
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationName: varchar("locationName", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  difficultyGrade: varchar("difficultyGrade", { length: 10 }).notNull(),
  gradeSystem: varchar("gradeSystem", { length: 10 }).notNull(),
  tags: jsonb("tags"), 
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

/**
 * Videos table
 */
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  routeId: integer("routeId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  duration: integer("duration"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * Bookmarks table
 */
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  routeId: integer("routeId").notNull(),
  videoId: integer("videoId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

/**
 * Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  routes: many(routes),
  videos: many(videos),
  bookmarks: many(bookmarks),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  user: one(users, { fields: [routes.userId], references: [users.id] }),
  videos: many(videos),
  bookmarks: many(bookmarks),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, { fields: [videos.userId], references: [users.id] }),
  route: one(routes, { fields: [videos.routeId], references: [routes.id] }),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  route: one(routes, { fields: [bookmarks.routeId], references: [routes.id] }),
  video: one(videos, { fields: [bookmarks.videoId], references: [videos.id] }),
}));