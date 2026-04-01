import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Mountain, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loginMutation = trpc.auth.login.useMutation();

  // If already authenticated, redirect to feed
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = "/feed";
    }
  }, [isAuthenticated, authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success("Welcome back!");
      window.location.href = "/feed";
    } catch (error: any) {
      toast.error(error.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
              <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
              <p className="text-gray-400 mt-2">Sign in to your account</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-2xl h-12"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-2xl h-12"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{" "}
              <a href="/signup" className="text-blue-400 hover:text-blue-300 transition">Create one</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
