import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, Mountain, Zap, Shield, Globe } from "lucide-react";

export default function Signup() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = "/feed";
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/30">
              <Mountain className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Join ClimbFlow</h1>
              <p className="text-gray-400 mt-2">Create your account and start sharing your climbing journey</p>
            </div>
          </div>

          {/* Signup button */}
          <div className="space-y-4">
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold">CF</div>
              Create Account
            </a>

            <p className="text-center text-gray-500 text-xs">
              Already have an account?{" "}
              <a href="/login" className="text-blue-400 hover:text-blue-300 transition">Sign in</a>
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-gray-500 text-xs uppercase tracking-wider text-center">Why join?</p>
            <div className="space-y-2.5">
              {[
                { icon: Zap, text: "Upload and share climbing videos instantly" },
                { icon: Globe, text: "Discover routes from around the world" },
                { icon: Shield, text: "Secure account with one-click login" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-gray-300 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-cyan-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-cyan-400" />
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
