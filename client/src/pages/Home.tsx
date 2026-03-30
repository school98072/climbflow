import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Play, MapPin, Upload, Search, Mountain, ChevronRight, Compass, Bookmark } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col">
      {/* ── Top Navigation ── */}
      <nav className="flex-shrink-0 border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/30">
              CF
            </div>
            <span className="text-xl font-bold tracking-tight">ClimbFlow</span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:block text-sm text-gray-400">
                  {user?.name || "Climber"}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition">
                  Login
                </a>
                <a
                  href="/signup"
                  className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition"
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24">
        {/* Logo mark */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/40">
          <Mountain className="h-12 w-12 text-white" />
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
            Share Your
          </span>
          <br />
          <span className="text-white">Climbing Journey</span>
        </h1>

        <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
          Upload your sends, discover routes worldwide, and learn from the global climbing community — one vertical video at a time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:justify-center">
          <a
            href="/feed"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5"
          >
            <Play className="h-5 w-5" />
            Watch Climbs
          </a>
          {isAuthenticated ? (
            <a
              href="/upload"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all border border-white/20 hover:-translate-y-0.5"
            >
              <Upload className="h-5 w-5" />
              Upload Climb
            </a>
          ) : (
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all border border-white/20 hover:-translate-y-0.5"
            >
              Get Started Free
              <ChevronRight className="h-5 w-5" />
            </a>
          )}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="max-w-5xl mx-auto w-full px-4 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              href: "/feed",
              icon: Play,
              label: "Video Feed",
              desc: "Reels-style vertical climbing videos",
              color: "from-blue-600/20 to-blue-800/20 border-blue-700/30",
              iconColor: "text-blue-400",
            },
            {
              href: "/explore",
              icon: Search,
              label: "Explore",
              desc: "Search by location or grade",
              color: "from-cyan-600/20 to-cyan-800/20 border-cyan-700/30",
              iconColor: "text-cyan-400",
            },
            {
              href: "/map",
              icon: Compass,
              label: "Route Map",
              desc: "Interactive global climbing map",
              color: "from-green-600/20 to-green-800/20 border-green-700/30",
              iconColor: "text-green-400",
            },
            {
              href: isAuthenticated ? "/upload" : "/login",
              icon: Upload,
              label: "Upload",
              desc: "Share your latest ascent",
              color: "from-purple-600/20 to-purple-800/20 border-purple-700/30",
              iconColor: "text-purple-400",
            },
          ].map(({ href, icon: Icon, label, desc, color, iconColor }) => (
            <a
              key={label}
              href={href}
              className={`group relative bg-gradient-to-br ${color} border rounded-2xl p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer`}
            >
              <Icon className={`h-7 w-7 ${iconColor} mb-3`} />
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-snug">{desc}</p>
              <ChevronRight className="absolute top-4 right-4 h-4 w-4 text-gray-600 group-hover:text-gray-400 transition" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {[
            { href: "/", icon: Mountain, label: "Home" },
            { href: "/feed", icon: Play, label: "Feed" },
            { href: "/explore", icon: Search, label: "Explore" },
            { href: "/map", icon: MapPin, label: "Map" },
            { href: isAuthenticated ? "/upload" : "/login", icon: Upload, label: "Upload" },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition min-w-[52px]"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-20" />

      {/* ── Footer ── */}
      <footer className="hidden md:block border-t border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; 2026 ClimbFlow — Built for climbers, by climbers.</p>
        </div>
      </footer>
    </div>
  );
}
