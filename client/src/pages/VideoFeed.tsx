import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VideoItem {
  id: number;
  title: string;
  routeName: string;
  locationName: string;
  difficultyGrade: string;
  gradeSystem: string;
  videoUrl: string;
  thumbnailUrl?: string;
  views: number;
  description?: string;
  tags?: string[];
  userId: number;
  createdAt: Date;
}

export default function VideoFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkedRoutes, setBookmarkedRoutes] = useState<Set<number>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Fetch videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // TODO: Replace with actual tRPC call
        // const result = await trpc.videos.getAll.useQuery({ limit: 20, offset: 0 });
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Handle video playback
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex]);

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "down" && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleBookmark = (routeId: number) => {
    setBookmarkedRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      handleScroll("down");
    } else {
      handleScroll("up");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <p className="text-xl mb-4">No videos yet</p>
          <Button variant="outline" asChild>
            <a href="/upload">Upload your first climb</a>
          </Button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const isBookmarked = bookmarkedRoutes.has(currentVideo.id);

  return (
    <div
      className="relative w-full h-screen bg-black overflow-hidden flex flex-col md:flex-row"
      onWheel={handleWheel}
    >
      {/* Main Video Container */}
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={(el) => {
            videoRefs.current[currentIndex] = el;
          }}
          src={currentVideo.videoUrl}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />

        {/* Video Info Overlay - Bottom Left */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4 md:p-6 text-white">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold">{currentVideo.routeName}</h2>
            <p className="text-sm md:text-base text-gray-300">{currentVideo.locationName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">
                {currentVideo.difficultyGrade}
              </Badge>
              {currentVideo.tags && currentVideo.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {currentVideo.description && <p className="text-sm text-gray-200 line-clamp-2">{currentVideo.description}</p>}
          </div>
        </div>

        {/* Progress Bar - Right Side (Vertical) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-2">
          <div className="h-32 w-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="w-full bg-blue-500 transition-all duration-300"
              style={{
                height: `${((currentIndex + 1) / videos.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-white text-xs font-semibold">
            {currentIndex + 1}/{videos.length}
          </span>
        </div>

        {/* Action Buttons - Right Side (Ghost Style) */}
        <div className="absolute right-4 bottom-24 md:bottom-auto md:right-20 md:top-1/2 md:-translate-y-1/2 flex md:flex-col gap-4">
          <button
            onClick={() => handleBookmark(currentVideo.id)}
            className="p-3 rounded-full hover:bg-white/20 transition text-white"
            title="Bookmark route"
          >
            <Bookmark className={`h-6 w-6 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
          <button className="p-3 rounded-full hover:bg-white/20 transition text-white" title="Like">
            <Heart className="h-6 w-6" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/20 transition text-white" title="Comment">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/20 transition text-white" title="Share">
            <Share2 className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => handleScroll("up")}
          className="absolute top-4 left-1/2 -translate-x-1/2 p-2 rounded-full hover:bg-white/20 transition text-white md:hidden"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={() => handleScroll("down")}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full hover:bg-white/20 transition text-white md:hidden"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar - Desktop Only */}
      <div className="hidden md:flex flex-col w-64 bg-gray-900 border-l border-gray-800 overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Video Queue</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {videos.map((video, index) => (
            <div
              key={video.id}
              onClick={() => setCurrentIndex(index)}
              className={`p-3 border-b border-gray-800 cursor-pointer transition ${
                index === currentIndex ? "bg-blue-600/20" : "hover:bg-gray-800"
              }`}
            >
              {video.thumbnailUrl && (
                <img src={video.thumbnailUrl} alt={video.routeName} className="w-full h-24 object-cover rounded mb-2" />
              )}
              <p className="text-white text-sm font-medium truncate">{video.routeName}</p>
              <p className="text-gray-400 text-xs truncate">{video.locationName}</p>
              <Badge className="mt-1 text-xs">{video.difficultyGrade}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
