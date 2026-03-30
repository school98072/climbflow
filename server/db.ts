import { eq, like, and, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userProfiles, routes, videos, bookmarks, InsertRoute, InsertVideo, InsertUserProfile } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * User profile queries
 */
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

/**
 * Route queries
 */
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

export async function getRoutesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).where(eq(routes.userId, userId));
}

export async function searchRoutes(filters: { locationName?: string; difficultyGrade?: string; gradeSystem?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters.locationName) {
    conditions.push(like(routes.locationName, `%${filters.locationName}%`));
  }
  if (filters.difficultyGrade) {
    conditions.push(eq(routes.difficultyGrade, filters.difficultyGrade));
  }
  if (filters.gradeSystem) {
    conditions.push(eq(routes.gradeSystem, filters.gradeSystem));
  }
  
  if (conditions.length === 0) {
    return db.select().from(routes);
  }
  
  return db.select().from(routes).where(and(...conditions));
}

/**
 * Video queries
 */
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

export async function getAllVideos(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).limit(limit).offset(offset);
}

export async function incrementVideoViews(videoId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(videos).set({ views: sql`views + 1` }).where(eq(videos.id, videoId));
}

/**
 * Bookmark queries
 */
export async function createBookmark(userId: number, routeId: number, videoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  return db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
}

export async function isRouteBookmarked(userId: number, routeId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.routeId, routeId))).limit(1);
  return result.length > 0;
}
