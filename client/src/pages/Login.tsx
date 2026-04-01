import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, Mountain, Play, MapPin, Users } from "lucide-react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();

  // If already authenticated, redirect to feed or redirectUri if present
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUri = searchParams.get("redirectUri");
      const state = searchParams.get("state");

      if (redirectUri) {
        // If we have a redirectUri, it means we are in an OAuth flow.
        // Redirect back with a mock code (the backend will need to handle this).
        const url = new URL(redirectUri);
        url.searchParams.set("code", "mock_auth_code_" + Date.now());
        if (state) {
          url.searchParams.set("state", state);
        }
        window.location.href = url.toString();
      } else {
        window.location.href = "/feed";
      }
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white text-sm">
          CF
        </div>
        <span className="text-white text-xl font-bold">ClimbFlow</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
              <Mountain className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back</h1>
              <p className="text-gray-400 mt-2">Sign in to share your climbs and discover routes</p>
            </div>
          </div>

          {/* Login button */}
          <div className="space-y-4">
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold">CF</div>
              Continue with ClimbFlow
            </a>

            <p className="text-center text-gray-500 text-xs">
              By continuing, you agree to our{" "}
              <span className="text-gray-400 underline cursor-pointer">Terms of Service</span>
              {" "}and{" "}
              <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>
            </p>
          </div>

          {/* Features preview */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-gray-500 text-xs uppercase tracking-wider text-center">What you'll get</p>
            <div className="space-y-2.5">
              {[
                { icon: Play, text: "Full-screen vertical climbing feed" },
                { icon: MapPin, text: "Interactive route map with GPS" },
                { icon: Users, text: "Connect with climbers worldwide" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-gray-300 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition">
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
