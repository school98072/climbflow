import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB module ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserProfile: vi.fn().mockResolvedValue(null),
  createUserProfile: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  createRoute: vi.fn().mockResolvedValue({ id: 42 }),
  getRouteById: vi.fn().mockResolvedValue(null),
  getAllRoutes: vi.fn().mockResolvedValue([]),
  getRoutesByUserId: vi.fn().mockResolvedValue([]),
  searchRoutesWithVideos: vi.fn().mockResolvedValue([]),
  createVideo: vi.fn().mockResolvedValue({ id: 99 }),
  getVideoById: vi.fn().mockResolvedValue(null),
  getVideosByRouteId: vi.fn().mockResolvedValue([]),
  getAllVideosWithRoutes: vi.fn().mockResolvedValue([]),
  incrementVideoViews: vi.fn().mockResolvedValue(undefined),
  createBookmark: vi.fn().mockResolvedValue(undefined),
  deleteBookmark: vi.fn().mockResolvedValue(undefined),
  getUserBookmarks: vi.fn().mockResolvedValue([]),
  isRouteBookmarked: vi.fn().mockResolvedValue(false),
  updateLastSignedIn: vi.fn().mockResolvedValue(undefined),
  createLike: vi.fn().mockResolvedValue(undefined),
  deleteLike: vi.fn().mockResolvedValue(undefined),
  getVideoLikesCount: vi.fn().mockResolvedValue(0),
  isVideoLikedByUser: vi.fn().mockResolvedValue(false),
  createComment: vi.fn().mockResolvedValue(undefined),
  deleteComment: vi.fn().mockResolvedValue(undefined),
  getVideoComments: vi.fn().mockResolvedValue([]),
}));

// ─── Mock auth module ─────────────────────────────────────────────────────────
vi.mock("./auth", () => ({
  getLucia: vi.fn().mockResolvedValue({
    createSession: vi.fn().mockResolvedValue({ id: "mock-session" }),
    createSessionCookie: vi.fn().mockReturnValue({
      serialize: () => "auth_session=mock-session; Path=/; HttpOnly",
      attributes: { maxAge: 3600 }
    }),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      serialize: () => "auth_session=; Path=/; Max-Age=0; HttpOnly",
      attributes: { maxAge: -1 }
    }),
    readSessionCookie: vi.fn().mockReturnValue("mock-session"),
    invalidateSession: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ─── Mock storage module ───────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.mp4", key: "videos/1/test.mp4" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.mp4", key: "videos/1/test.mp4" }),
}));

// ─── Test helpers ──────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    email: "climber@example.com",
    name: "Test Climber",
    role: "user",
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = null, session: any = null): TrpcContext {
  const headers: Record<string, string> = {};
  return {
    user,
    session,
    req: { 
      protocol: "https", 
      headers: { cookie: "auth_session=mock-session" } 
    } as any,
    res: {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      _headers: headers,
    } as any,
  };
}

// ─── Auth tests ────────────────────────────────────────────────────────────────
describe("auth", () => {
  it("auth.me returns null when unauthenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user when authenticated", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 1, email: "climber@example.com" });
  });

  it("auth.logout clears session cookie", async () => {
    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    
    const setCookie = (ctx.res as any)._headers["Set-Cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("Max-Age=0");
  });
});

// ─── Routes tests ──────────────────────────────────────────────────────────────
describe("routes", () => {
  it("routes.getAll returns empty array by default", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.routes.getAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("routes.search returns empty array with no filters", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.routes.search({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("routes.search accepts locationName filter", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.routes.search({ locationName: "Fontainebleau" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("routes.search accepts difficultyGrade filter", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.routes.search({ difficultyGrade: "V5", gradeSystem: "hueco" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("routes.create requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.routes.create({
        name: "Test Route",
        locationName: "Boulder, CO",
        latitude: 40.0,
        longitude: -105.2,
        difficultyGrade: "V5",
        gradeSystem: "hueco",
      })
    ).rejects.toThrow();
  });

  it("routes.create succeeds when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.routes.create({
      name: "The Crimper",
      locationName: "Fontainebleau, France",
      latitude: 48.4,
      longitude: 2.7,
      difficultyGrade: "V7",
      gradeSystem: "hueco",
      tags: ["Crimps", "Overhang"],
      description: "Classic crimpy problem",
    });
    expect(result).toBeDefined();
  });
});

// ─── Videos tests ──────────────────────────────────────────────────────────────
describe("videos", () => {
  it("videos.getAll returns empty array by default", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.videos.getAll({ limit: 20, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("videos.create requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.videos.create({
        routeId: 1,
        title: "My First V5",
        videoUrl: "https://cdn.example.com/video.mp4",
      })
    ).rejects.toThrow();
  });

  it("videos.create succeeds when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.videos.create({
      routeId: 1,
      title: "Crushing the Crimper",
      videoUrl: "https://cdn.example.com/video.mp4",
      description: "Finally sent it!",
    });
    expect(result).toBeDefined();
  });

  it("videos.incrementViews works without auth", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.videos.incrementViews({ videoId: 1 })).resolves.not.toThrow();
  });

  it("videos.uploadFile requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.videos.uploadFile({
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileBase64: btoa("fake video content"),
      })
    ).rejects.toThrow();
  });

  it("videos.uploadFile returns url when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.videos.uploadFile({
      fileName: "climb.mp4",
      fileType: "video/mp4",
      fileBase64: btoa("fake video content"),
    });
    expect(result).toHaveProperty("url");
    expect(result.url).toContain("https://");
  });
});

// ─── Bookmarks tests ───────────────────────────────────────────────────────────
describe("bookmarks", () => {
  it("bookmarks.add requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.bookmarks.add({ routeId: 1 })).rejects.toThrow();
  });

  it("bookmarks.add succeeds when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.bookmarks.add({ routeId: 1, videoId: 1 })).resolves.not.toThrow();
  });

  it("bookmarks.remove requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.bookmarks.remove({ routeId: 1 })).rejects.toThrow();
  });

  it("bookmarks.getMyBookmarks returns empty array by default", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.bookmarks.getMyBookmarks();
    expect(Array.isArray(result)).toBe(true);
  });

  it("bookmarks.isBookmarked returns false by default", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.bookmarks.isBookmarked({ routeId: 1 });
    expect(result).toBe(false);
  });
});

// ─── Profile tests ─────────────────────────────────────────────────────────────
describe("profile", () => {
  it("profile.getMe requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.profile.getMe()).rejects.toThrow();
  });

  it("profile.getMe returns null when no profile exists", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.profile.getMe();
    expect(result).toBeNull();
  });

  it("profile.updateProfile creates new profile when none exists", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(
      caller.profile.updateProfile({
        bio: "V5 climber from Taipei",
        climbingLevel: "Intermediate",
        favoriteGradeSystem: "hueco",
      })
    ).resolves.not.toThrow();
  });
});
