import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateLastSignedIn,
  createRoute,
  createVideo,
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  getVideosByRouteId,
  getAllVideosWithRoutes,
  searchRoutesWithVideos,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  isRouteBookmarked,
  incrementVideoViews,
  getAllRoutes,
  createLike,
  deleteLike,
  getVideoLikesCount,
  isVideoLikedByUser,
  createComment,
  deleteComment,
  getVideoComments,
} from "./db";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  const derivedKey = scryptSync(password, salt!, 64);
  return timingSafeEqual(derivedKey, Buffer.from(key!, "hex"));
}

async function createSessionToken(userId: number) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(secret);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    
    signup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new Error("Email already registered");

        const passwordHash = hashPassword(input.password);
        const user = await createUser({
          email: input.email,
          passwordHash,
          name: input.name || null,
        });

        const token = await createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return user;
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new Error("Invalid email or password");
        }

        await updateLastSignedIn(user.id);
        const token = await createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return user;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  routes: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          locationName: z.string().min(1),
          latitude: z.number(),
          longitude: z.number(),
          difficultyGrade: z.string(),
          gradeSystem: z.enum(["hueco", "yds"]),
          tags: z.array(z.string()).optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createRoute({
          userId: ctx.user.id,
          name: input.name,
          locationName: input.locationName,
          latitude: input.latitude.toString() as any,
          longitude: input.longitude.toString() as any,
          difficultyGrade: input.difficultyGrade,
          gradeSystem: input.gradeSystem,
          tags: input.tags,
          description: input.description,
        });
      }),

    search: publicProcedure
      .input(
        z.object({
          locationName: z.string().optional(),
          difficultyGrade: z.string().optional(),
          gradeSystem: z.enum(["hueco", "yds"]).optional(),
        })
      )
      .query(async ({ input }) => {
        return await searchRoutesWithVideos(input);
      }),

    getAll: publicProcedure.query(async () => {
      return await getAllRoutes();
    }),
  }),

  videos: router({
    // Upload a video file to S3 and return the URL
    uploadFile: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileBase64: z.string(), // base64 encoded file content
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ext = input.fileName.split(".").pop() || "mp4";
        const key = `videos/${ctx.user.id}/${nanoid()}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(key, buffer, input.fileType);
        return { url, key };
      }),

    // Upload thumbnail image
    uploadThumbnail: protectedProcedure
      .input(
        z.object({
          fileBase64: z.string(),
          fileType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const key = `thumbnails/${ctx.user.id}/${nanoid()}.jpg`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(key, buffer, input.fileType);
        return { url, key };
      }),

    create: protectedProcedure
      .input(
        z.object({
          routeId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          videoUrl: z.string(),
          thumbnailUrl: z.string().optional(),
          duration: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createVideo({
          userId: ctx.user.id,
          ...input,
        });
      }),

    getAll: publicProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await getAllVideosWithRoutes(input.limit, input.offset);
      }),

    getByRoute: publicProcedure
      .input(z.object({ routeId: z.number() }))
      .query(async ({ input }) => {
        return await getVideosByRouteId(input.routeId);
      }),

    incrementViews: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ input }) => {
        await incrementVideoViews(input.videoId);
      }),
  }),

  bookmarks: router({
    add: protectedProcedure
      .input(
        z.object({
          routeId: z.number(),
          videoId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createBookmark(ctx.user.id, input.routeId, input.videoId);
      }),

    remove: protectedProcedure
      .input(z.object({ routeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteBookmark(ctx.user.id, input.routeId);
      }),

    getMyBookmarks: protectedProcedure.query(async ({ ctx }) => {
      return await getUserBookmarks(ctx.user.id);
    }),

    isBookmarked: protectedProcedure
      .input(z.object({ routeId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await isRouteBookmarked(ctx.user.id, input.routeId);
      }),
  }),

  profile: router({
    getMe: protectedProcedure.query(async ({ ctx }) => {
      return await getUserProfile(ctx.user.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          bio: z.string().optional(),
          avatarUrl: z.string().optional(),
          climbingLevel: z.string().optional(),
          favoriteGradeSystem: z.enum(["hueco", "yds"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getUserProfile(ctx.user.id);
        if (!profile) {
          await createUserProfile(ctx.user.id, input);
        } else {
          await updateUserProfile(ctx.user.id, input);
        }
        return await getUserProfile(ctx.user.id);
      }),
  }),

  likes: router({
    toggle: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isLiked = await isVideoLikedByUser(ctx.user.id, input.videoId);
        if (isLiked) {
          await deleteLike(ctx.user.id, input.videoId);
          return { liked: false };
        } else {
          await createLike(ctx.user.id, input.videoId);
          return { liked: true };
        }
      }),

    getCount: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .query(async ({ input }) => {
        return await getVideoLikesCount(input.videoId);
      }),

    isLiked: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await isVideoLikedByUser(ctx.user.id, input.videoId);
      }),
  }),

  comments: router({
    add: protectedProcedure
      .input(
        z.object({
          videoId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await createComment(ctx.user.id, input.videoId, input.content);
      }),

    remove: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await deleteComment(ctx.user.id, input.commentId);
      }),

    getForVideo: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .query(async ({ input }) => {
        return await getVideoComments(input.videoId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
