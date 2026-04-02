import { eq, like, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import {
  InsertUser, users, userProfiles, routes, videos, bookmarks,
  InsertRoute, InsertVideo, InsertUserProfile, User,
  likes, comments
} from "../drizzle/schema";
import { ENV } from './_core/env';
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getClient() {
  if (!_client && process.env.DATABASE_URL) {
    _client = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      connect_timeout: 30, // Increase timeout
      prepare: false,
    });
  }
  return _client;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = await getClient();
      if (client) {
        _db = drizzle(client, { schema });
      }
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      throw new Error("Database connection failed: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  if (!_db) {
    throw new Error("Database connection not established. Check DATABASE_URL environment variable.");
  }
  return _db;
}

// ─── User ────────────────────────────────────────────────────────────────────

export async function createUser(data: InsertUser): Promise<User> {
  const db = await getDb();
  try {
    const result = await db.insert(users).values(data).returning();
    if (!result || result.length === 0) {
      throw new Error("Insert succeeded but no data was returned.");
    }
    return result[0];
  } catch (error) {
    console.error("[Database] Error in createUser:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  if (!email) {
    console.warn("[Database] getUserByEmail called with empty email");
    return undefined;
  }
  const client = await getClient();
  if (!client) throw new Error("Database client not available");
  
  try {
    // Using raw postgres client for reliability
    const result = await client`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    if (result && result.length > 0) {
      return result[0] as unknown as User;
    }
    return undefined;
  } catch (error) {
    console.error(`[Database] Error in getUserByEmail for ${email}:`, error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const client = await getClient();
  if (!client) throw new Error("Database client not available");
  
  try {
    const result = await client`SELECT * FROM users WHERE open_id = ${openId} LIMIT 1`;
    if (result && result.length > 0) {
      return result[0] as unknown as User;
    }
    return undefined;
  } catch (error) {
    console.error(`[Database] Error in getUserByOpenId for ${openId}:`, error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  const client = await getClient();
  if (!client) throw new Error("Database client not available");
  
  try {
    const result = await client`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    if (result && result.length > 0) {
      return result[0] as unknown as User;
    }
    return undefined;
  } catch (error) {
    console.error(`[Database] Error in getUserById for ${id}:`, error);
    throw error;
  }
}

export async function updateLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
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
  
  // PostgreSQL uses onConflictDoNothing
  await db.insert(bookmarks).values({ userId, routeId, videoId }).onConflictDoNothing();
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

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function createLike(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(likes).values({ userId, videoId });
}

export async function deleteLike(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)));
}

export async function getVideoLikesCount(videoId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.videoId, videoId));
  return Number(result[0]?.count ?? 0);
}

export async function isVideoLikedByUser(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.videoId, videoId))).limit(1);
  return result.length > 0;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function createComment(userId: number, videoId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(comments).values({ userId, videoId, content }).returning();
  return result;
}

export async function deleteComment(userId: number, commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(and(eq(comments.userId, userId), eq(comments.id, commentId)));
}

export async function getVideoComments(videoId: number) {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(comments).where(eq(comments.videoId, videoId)).orderBy(desc(comments.createdAt));
  
  return Promise.all(
    results.map(async (comment) => {
      const userRows = await db!.select().from(users).where(eq(users.id, comment.userId)).limit(1);
      const user = userRows[0];
      return {
        ...comment,
        userName: user?.name ?? "Anonymous",
      };
    })
  );
}
