import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, ChevronUp, ChevronDown,
  MapPin, Play, Volume2, VolumeX, ArrowLeft, Upload, MoreVertical
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<Set<number>>(new Set());
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  
  // Fetch videos from tRPC
  const { data: videosData, isLoading, error } = trpc.videos.getAll.useQuery(
    { limit: 20, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const incrementViews = trpc.videos.incrementViews.useMutation();
  const addBookmark = trpc.bookmarks.add.useMutation();
  const removeBookmark = trpc.bookmarks.remove.useMutation();

  const videos: FeedVideo[] = useMemo(() => (videosData ?? []).map((v: any) => ({
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
  })), [videosData]);

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

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black">
        <div className="text-white text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto" />
          <p className="text-gray-300">Loading climbs...</p>
        </div>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black">
        <div className="text-white text-center space-y-6 px-8">
          <div className="w-20 h-20 rounded-full bg-blue-900/40 flex items-center justify-center mx-auto">
            <Play className="h-10 w-10 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">No climbs yet</h2>
            <p className="text-gray-400">Be the first to share your ascent!</p>
          </div>
          <div className="flex flex-col gap-3">
            <a href="/upload" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition">
              <Upload className="h-5 w-5" /> Upload a Climb
            </a>
            <a href="/" className="text-gray-400 hover:text-white text-sm transition">Back to Home</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-black overflow-hidden relative">
      {/* ── Fixed UI Elements ── */}
      <a href="/" className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition">
        <ArrowLeft className="h-5 w-5" />
      </a>

      <button onClick={() => setMuted(m => !m)} className="absolute top-4 right-4 lg:right-[17rem] z-50 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* ── Main Video Feed ── */}
      <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {videos.map((video, index) => (
          <VideoItem
            key={video.id}
            video={video}
            isActive={index === activeIndex}
            muted={muted}
            isLiked={likedVideos.has(video.id)}
            isBookmarked={bookmarkedRoutes.has(video.id)}
            onVisibilityChange={(isVisible) => {
              if (isVisible) {
                setActiveIndex(index);
                incrementViews.mutate({ videoId: video.id });
              }
            }}
            onLike={() => handleLike(video.id)}
            onBookmark={() => handleBookmark(video.id, video.id)}
            onShare={() => handleShare(video)}
          />
        ))}
      </div>

      {/* ── Desktop Sidebar ── */}
      <div className="hidden lg:flex w-64 h-full flex-col bg-zinc-950 border-l border-white/10 z-20">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-bold text-sm">Queue ({videos.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => {
                const el = document.getElementById(`video-${video.id}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full text-left p-3 border-b border-zinc-900 transition ${
                index === activeIndex ? "bg-blue-600/20" : "hover:bg-white/5"
              }`}
            >
              <div className="relative aspect-video rounded overflow-hidden mb-2 bg-zinc-900">
                {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-white text-xs font-semibold truncate">{video.routeName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${gradeColor(video.difficultyGrade)}`}>
                  {video.difficultyGrade}
                </span>
                <p className="text-zinc-500 text-[10px] truncate">{video.locationName}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoItem({ video, isActive, muted, isLiked, isBookmarked, onVisibilityChange, onLike, onBookmark, onShare }: {
  video: FeedVideo;
  isActive: boolean;
  muted: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  onVisibilityChange: (isVisible: boolean) => void;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [showBetaOverlay, setShowBetaOverlay] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(entry.isIntersecting),
      { threshold: 0.6 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setShowBetaOverlay(true);
      setTimeout(() => setShowBetaOverlay(false), 2000);
    }
    setLastTap(now);
  };

  return (
    <div
      id={`video-${video.id}`}
      ref={containerRef}
      className="relative h-[100dvh] w-full bg-black snap-start overflow-hidden flex items-center justify-center"
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        className="h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onClick={handleVideoTap}
        preload={isActive ? "auto" : "none"}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* ── Beta Overlay ── */}
      <AnimatePresence>
        {showBetaOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-8 py-6 text-center border border-white/10">
              <p className="text-white text-lg font-bold mb-1">🧗 Beta Mode</p>
              <p className="text-gray-300 text-sm">Hold analysis coming soon</p>
              <div className="mt-3 flex gap-2 justify-center flex-wrap">
                {(video.tags ?? []).map((tag) => (
                  <span key={tag} className="text-xs bg-blue-600/80 text-white px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Info Panel (Glassmorphism) ── */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-4 pb-12 lg:pb-8 pointer-events-none"
          >
            <div className="backdrop-blur-xl bg-black/20 p-5 rounded-3xl border border-white/10 max-w-lg pointer-events-auto">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={gradeColor(video.difficultyGrade)}>{video.difficultyGrade}</Badge>
                {(video.tags ?? []).slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-none text-[10px]">{tag}</Badge>
                ))}
              </div>
              
              <h2 className="text-white text-xl font-bold mb-1">{video.routeName}</h2>
              <div className="flex items-center text-white/60 text-xs mb-3">
                <MapPin className="h-3 w-3 mr-1" />
                {video.locationName}
              </div>
              
              {video.description && (
                <p className="text-white/80 text-sm line-clamp-2 mb-4 leading-relaxed font-light">
                  {video.description}
                </p>
              )}

              <div className="flex gap-2">
                <button className="flex-1 py-3 bg-white text-black font-bold rounded-2xl active:scale-95 transition text-sm">
                  View Beta Path
                </button>
                <div className="flex gap-2">
                  <button onClick={onBookmark} className={`p-3 rounded-2xl transition active:scale-95 ${isBookmarked ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
                    <Bookmark className={`h-5 w-5 text-white ${isBookmarked ? 'fill-white' : ''}`} />
                  </button>
                  <button onClick={onLike} className={`p-3 rounded-2xl transition active:scale-95 ${isLiked ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>
                    <Heart className={`h-5 w-5 text-white ${isLiked ? 'fill-white' : ''}`} />
                  </button>
                  <button onClick={onShare} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition active:scale-95">
                    <Share2 className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Side Progress Bar ── */}
      <div className="absolute right-4 top-1/4 bottom-1/4 w-1 bg-white/10 rounded-full overflow-hidden pointer-events-none">
        <motion.div 
          className="bg-blue-500 w-full origin-top"
          animate={{ height: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
}
