// v3-cache-bust-12345
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Mountain, Zap, Shield, Globe, Mail, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Signup() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const signupMutation = trpc.auth.signup.useMutation();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = "/feed";
    }
  }, [isAuthenticated, authLoading]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Dummy OAuth signup using email as openId for demonstration
      await signupMutation.mutateAsync({ email, openId: email, name, loginMethod: "oauth" });
      toast.success("Account created successfully!");
      window.location.href = "/feed";
    } catch (error: any) {
      toast.error(error.message || "Signup failed. User might already exist.");
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
      <div className="bg-blue-600 text-white text-center py-1 text-xs font-bold">OAUTH VERSION</div>
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
              <p className="text-gray-400 mt-2">Create your account via OAuth</p>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-2xl h-12"
                  required
                />
              </div>
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold h-12 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/30"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register via OAuth"}
            </Button>

            <p className="text-center text-gray-500 text-sm">
              Already have an account?{" "}
              <a href="/login" className="text-blue-400 hover:text-blue-300 transition">Sign in</a>
            </p>
          </form>

          {/* Benefits */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-gray-500 text-xs uppercase tracking-wider text-center">Why join?</p>
            <div className="space-y-2.5">
              {[
                { icon: Zap, text: "Upload and share climbing videos instantly" },
                { icon: Globe, text: "Discover routes from around the world" },
                { icon: Shield, text: "Secure account with identity protection" },
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
        </div>
      </div>
    </div>
  );
}
