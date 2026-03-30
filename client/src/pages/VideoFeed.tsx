import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Heart, MessageCircle, Share2, Bookmark, ChevronUp, ChevronDown,
  MapPin, Play, Volume2, VolumeX, ArrowLeft, Upload
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type FeedVideo = {
  id: number;
  title: string;
  routeName: string;
  locationName: string;
  difficultyGrade: string;
  gradeSystem: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  views: number;
  description?: string | null;
  tags?: string[];
  userId: number;
  createdAt: Date;
};

// Difficulty colour mapping
function gradeColor(grade: string): string {
  const n = parseInt(grade.replace("V", ""), 10);
  if (isNaN(n)) return "bg-blue-600";
  if (n <= 3) return "bg-green-500";
  if (n <= 6) return "bg-yellow-500";
  if (n <= 9) return "bg-orange-500";
  return "bg-red-600";
}

export default function VideoFeed() {
  const { isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<Set<number>>(new Set());
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [doubleTapOverlay, setDoubleTapOverlay] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartY = useRef<number>(0);

  // Fetch videos from tRPC
  const { data: videosData, isLoading, error } = trpc.videos.getAll.useQuery(
    { limit: 20, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const incrementViews = trpc.videos.incrementViews.useMutation();
  const addBookmark = trpc.bookmarks.add.useMutation();
  const removeBookmark = trpc.bookmarks.remove.useMutation();

  const videos: FeedVideo[] = (videosData ?? []).map((v: any) => ({
    id: v.id,
    title: v.title,
    routeName: v.routeName ?? v.title,
    locationName: v.locationName ?? "",
    difficultyGrade: v.difficultyGrade ?? "",
    gradeSystem: v.gradeSystem ?? "hueco",
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    views: v.views ?? 0,
    description: v.description,
    tags: (v.tags as string[]) ?? [],
    userId: v.userId,
    createdAt: new Date(v.createdAt),
  }));

  // Auto-play/pause on index change
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentIndex) {
        video.play().catch(() => {});
        incrementViews.mutate({ videoId: videos[index]?.id ?? 0 });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, videos.length]);

  const goNext = useCallback(() => {
    if (currentIndex < videos.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, videos.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp" || e.key === "k") goPrev();
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Wheel scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 50) goNext();
    else if (e.deltaY < -50) goPrev();
  }, [goNext, goPrev]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Double-tap beta overlay
  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setDoubleTapOverlay(true);
      setTimeout(() => setDoubleTapOverlay(false), 1200);
    }
    setLastTap(now);
  };

  const handleBookmark = (routeId: number, videoId: number) => {
    if (!isAuthenticated) {
      toast.error("Please log in to bookmark routes");
      return;
    }
    setBookmarkedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
        removeBookmark.mutate({ routeId });
        toast.success("Removed from bookmarks");
      } else {
        next.add(routeId);
        addBookmark.mutate({ routeId, videoId });
        toast.success("Route bookmarked!");
      }
      return next;
    });
  };

  const handleLike = (videoId: number) => {
    if (!isAuthenticated) { toast.error("Please log in to like videos"); return; }
    setLikedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) { next.delete(videoId); toast("Unliked"); }
      else { next.add(videoId); toast.success("❤️ Liked!"); }
      return next;
    });
  };

  const handleShare = async (video: FeedVideo) => {
    const url = window.location.origin + `/feed?v=${video.id}`;
    if (navigator.share) {
      await navigator.share({ title: video.routeName, text: `Check out this ${video.difficultyGrade} climb at ${video.locationName}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto" />
          <p className="text-gray-300">Loading climbs...</p>
        </div>
      </div>
    );
  }

  // ── Empty / Error ─────────────────────────────────────────────────────────────
  if (error || videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center space-y-6 px-8">
          <div className="w-20 h-20 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto">
            <Play className="h-10 w-10 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">No climbs yet</h2>
            <p className="text-gray-400">Be the first to share your ascent!</p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="/upload"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition"
            >
              <Upload className="h-5 w-5" />
              Upload a Climb
            </a>
            <a href="/" className="text-gray-400 hover:text-white text-sm transition">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const isBookmarked = bookmarkedRoutes.has(currentVideo.id);
  const isLiked = likedVideos.has(currentVideo.id);
  const progressPct = ((currentIndex + 1) / videos.length) * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Back button ── */}
      <a
        href="/"
        className="absolute top-4 left-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
      >
        <ArrowLeft className="h-5 w-5" />
      </a>

      {/* ── Mute button ── */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* ── Video stack ── */}
      <div className="absolute inset-0" onClick={handleVideoTap}>
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${(index - currentIndex) * 100}%)` }}
          >
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={video.videoUrl}
              poster={video.thumbnailUrl ?? undefined}
              className="w-full h-full object-cover"
              loop
              muted={muted}
              playsInline
              preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* ── Double-tap Beta Overlay ── */}
      {doubleTapOverlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-8 py-6 text-center animate-in fade-in zoom-in duration-200">
            <p className="text-white text-lg font-bold mb-1">🧗 Beta Mode</p>
            <p className="text-gray-300 text-sm">Hold analysis coming soon</p>
            <div className="mt-3 flex gap-2 justify-center flex-wrap">
              {(currentVideo.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs bg-blue-600/80 text-white px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Info Overlay ── */}
      <div className="absolute bottom-0 left-0 right-16 z-20 p-4 pb-8 pointer-events-none">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${gradeColor(currentVideo.difficultyGrade)}`}>
              {currentVideo.difficultyGrade}
            </span>
            {(currentVideo.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs border border-white/40 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-white text-xl font-bold leading-tight drop-shadow-lg">
            {currentVideo.routeName}
          </h2>
          <p className="text-gray-300 text-sm flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {currentVideo.locationName}
          </p>
          {currentVideo.description && (
            <p className="text-gray-300 text-xs line-clamp-2">{currentVideo.description}</p>
          )}
          <p className="text-gray-500 text-xs">{currentVideo.views.toLocaleString()} views</p>
        </div>
      </div>

      {/* ── Right Action Buttons (Ghost Style) ── */}
      <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center gap-5">
        {/* Bookmark */}
        <button
          onClick={() => handleBookmark(currentVideo.id, currentVideo.id)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`p-3 rounded-full transition ${isBookmarked ? "bg-blue-600/80" : "bg-black/40 backdrop-blur-sm group-hover:bg-black/60"}`}>
            <Bookmark className={`h-6 w-6 text-white ${isBookmarked ? "fill-white" : ""}`} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">Save</span>
        </button>

        {/* Like */}
        <button
          onClick={() => handleLike(currentVideo.id)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`p-3 rounded-full transition ${isLiked ? "bg-red-600/80" : "bg-black/40 backdrop-blur-sm group-hover:bg-black/60"}`}>
            <Heart className={`h-6 w-6 text-white ${isLiked ? "fill-white" : ""}`} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">Like</span>
        </button>

        {/* Share */}
        <button
          onClick={() => handleShare(currentVideo)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">Share</span>
        </button>

        {/* Map link */}
        <a
          href="/map"
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">Map</span>
        </a>
      </div>

      {/* ── Vertical Progress Bar (right edge) ── */}
      <div className="absolute right-0 top-0 bottom-0 w-1 z-20 bg-white/10">
        <div
          className="w-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ height: `${progressPct}%` }}
        />
        {/* Difficulty markers */}
        {videos.map((v, i) => (
          <button
            key={v.id}
            onClick={() => setCurrentIndex(i)}
            className="absolute w-3 h-3 -left-1 rounded-full border-2 border-white transition-all"
            style={{
              top: `${((i + 0.5) / videos.length) * 100}%`,
              transform: "translateY(-50%)",
              backgroundColor: i === currentIndex ? "#3b82f6" : "rgba(255,255,255,0.3)",
            }}
            title={v.difficultyGrade}
          />
        ))}
      </div>

      {/* ── Up/Down navigation (mobile) ── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-20 flex gap-6 md:hidden">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white disabled:opacity-30 transition"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <span className="text-white/60 text-xs self-center">
          {currentIndex + 1} / {videos.length}
        </span>
        <button
          onClick={goNext}
          disabled={currentIndex === videos.length - 1}
          className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white disabled:opacity-30 transition"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex absolute right-16 top-0 bottom-0 w-64 flex-col bg-black/60 backdrop-blur-md border-l border-white/10 z-20 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-bold text-sm">Queue ({videos.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-full text-left p-3 border-b border-white/5 transition ${
                index === currentIndex ? "bg-blue-600/30" : "hover:bg-white/10"
              }`}
            >
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.routeName} className="w-full h-20 object-cover rounded mb-2" />
              ) : (
                <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center">
                  <Play className="h-6 w-6 text-gray-600" />
                </div>
              )}
              <p className="text-white text-xs font-semibold truncate">{video.routeName}</p>
              <p className="text-gray-400 text-xs truncate">{video.locationName}</p>
              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full text-white ${gradeColor(video.difficultyGrade)}`}>
                {video.difficultyGrade}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
