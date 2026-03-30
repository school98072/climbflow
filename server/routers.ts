import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createRoute,
  createVideo,
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  getVideosByRouteId,
  getAllVideos,
  searchRoutes,
  getUserProfile,
  createUserProfile,
  isRouteBookmarked,
  incrementVideoViews,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
        return await searchRoutes(input);
      }),
  }),

  videos: router({
    create: protectedProcedure
      .input(
        z.object({
          routeId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          videoUrl: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
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
        return await getAllVideos(input.limit, input.offset);
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
          return await getUserProfile(ctx.user.id);
        }
        return profile;
      }),
  }),
});

export type AppRouter = typeof appRouter;
