import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { getLucia } from "./auth";
import { hash, compare } from "bcryptjs";
import {
  createUser,
  getUserByEmail,
  getUserByOpenId,
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
        try {
          console.log(`[Auth] Signup attempt: ${input.email}`);
          
          const existing = await getUserByEmail(input.email);
          if (existing) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email already registered",
            });
          }

          const passwordHash = await hash(input.password, 10);
          const user = await createUser({
            email: input.email,
            passwordHash,
            name: input.name || null,
            loginMethod: "email",
          });

          if (!user) {
            throw new Error("Failed to create user record");
          }

          const lucia = await getLucia();
          const session = await lucia.createSession(user.id.toString(), {});
          const sessionCookie = lucia.createSessionCookie(session.id);
          
          ctx.res.setHeader("Set-Cookie", sessionCookie.serialize());
          
          return user;
        } catch (error: any) {
          console.error("[Auth] Signup error:", error);
          if (error instanceof TRPCError) throw error;
          
          if (error.code === '23505' || error.message?.includes('unique constraint')) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email already in use",
            });
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "An unexpected error occurred during signup",
          });
        }
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await getUserByEmail(input.email);
          if (!user || !user.passwordHash) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid email or password",
            });
          }

          const validPassword = await compare(input.password, user.passwordHash);
          if (!validPassword) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid email or password",
            });
          }

          await updateLastSignedIn(user.id);
          
          const lucia = await getLucia();
          const session = await lucia.createSession(user.id.toString(), {});
          const sessionCookie = lucia.createSessionCookie(session.id);
          
          ctx.res.setHeader("Set-Cookie", sessionCookie.serialize());
          
          return user;
        } catch (error: any) {
          console.error("[Auth] Login error:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "An unexpected error occurred during login",
          });
        }
      }),

    // Keep original openId login for compatibility or future OAuth
    loginOAuth: publicProcedure
      .input(z.object({
        openId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await getUserByOpenId(input.openId);
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found",
            });
          }

          await updateLastSignedIn(user.id);
          
          const lucia = await getLucia();
          const session = await lucia.createSession(user.id.toString(), {});
          const sessionCookie = lucia.createSessionCookie(session.id);
          
          ctx.res.setHeader("Set-Cookie", sessionCookie.serialize());
          
          return user;
        } catch (error: any) {
          console.error("[Auth] OAuth login error:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "An unexpected error occurred during OAuth login",
          });
        }
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const lucia = await getLucia();
      const cookieHeader = ctx.req.headers.cookie || "";
      const sessionId = lucia.readSessionCookie(cookieHeader);
      
      if (sessionId) {
        await lucia.invalidateSession(sessionId);
      }

      const sessionCookie = lucia.createBlankSessionCookie();
      ctx.res.setHeader("Set-Cookie", sessionCookie.serialize());
      
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
