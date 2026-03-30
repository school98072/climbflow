import { eq, like, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, userProfiles, routes, videos, bookmarks,
  InsertRoute, InsertVideo, InsertUserProfile
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userProfiles).values({ userId, ...data });
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set({ ...data, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function createRoute(data: InsertRoute) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(routes).values(data);
  return result;
}

export async function getRouteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllRoutes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).orderBy(desc(routes.createdAt));
}

export async function getRoutesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).where(eq(routes.userId, userId));
}

export async function searchRoutesWithVideos(filters: {
  locationName?: string;
  difficultyGrade?: string;
  gradeSystem?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.locationName) conditions.push(like(routes.locationName, `%${filters.locationName}%`));
  if (filters.difficultyGrade) conditions.push(eq(routes.difficultyGrade, filters.difficultyGrade));
  if (filters.gradeSystem) conditions.push(eq(routes.gradeSystem, filters.gradeSystem));

  const routeRows = conditions.length === 0
    ? await db.select().from(routes).orderBy(desc(routes.createdAt))
    : await db.select().from(routes).where(and(...conditions)).orderBy(desc(routes.createdAt));

  // For each route, attach the first video thumbnail
  const result = await Promise.all(
    routeRows.map(async (route) => {
      const vids = await db!.select().from(videos).where(eq(videos.routeId, route.id)).limit(1);
      return {
        ...route,
        thumbnailUrl: vids[0]?.thumbnailUrl ?? null,
        videoCount: vids.length,
      };
    })
  );
  return result;
}

// ─── Videos ───────────────────────────────────────────────────────────────────

export async function createVideo(data: InsertVideo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(videos).values(data);
  return result;
}

export async function getVideoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getVideosByRouteId(routeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.routeId, routeId));
}

/**
 * Get all videos joined with their route information (for the feed)
 */
export async function getAllVideosWithRoutes(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const videoRows = await db
    .select()
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);

  const result = await Promise.all(
    videoRows.map(async (video) => {
      const routeRows = await db!.select().from(routes).where(eq(routes.id, video.routeId)).limit(1);
      const route = routeRows[0];
      return {
        ...video,
        routeName: route?.name ?? "Unknown Route",
        locationName: route?.locationName ?? "",
        difficultyGrade: route?.difficultyGrade ?? "",
        gradeSystem: route?.gradeSystem ?? "hueco",
        tags: (route?.tags as string[]) ?? [],
        latitude: route?.latitude ?? null,
        longitude: route?.longitude ?? null,
      };
    })
  );
  return result;
}

export async function incrementVideoViews(videoId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(videos).set({ views: sql`views + 1` }).where(eq(videos.id, videoId));
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function createBookmark(userId: number, routeId: number, videoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Prevent duplicate bookmarks
  const existing = await db.select().from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.routeId, routeId))).limit(1);
  if (existing.length > 0) return;
  await db.insert(bookmarks).values({ userId, routeId, videoId });
}

export async function deleteBookmark(userId: number, routeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.routeId, routeId)));
}

export async function getUserBookmarks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const bmarks = await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
  // Join with routes
  return Promise.all(
    bmarks.map(async (b) => {
      const routeRows = await db!.select().from(routes).where(eq(routes.id, b.routeId)).limit(1);
      return { ...b, route: routeRows[0] ?? null };
    })
  );
}

export async function isRouteBookmarked(userId: number, routeId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.routeId, routeId))).limit(1);
  return result.length > 0;
}
