import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, MapPin, Users, TrendingUp } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-blue-800/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center font-bold">
              CF
            </div>
            <span className="text-xl font-bold">ClimbFlow</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-300">Welcome, {user?.name || "Climber"}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/login">Login</a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/signup">Sign Up</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Share Your Climbing Journey
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Connect with climbers worldwide, share your ascents, discover new routes, and learn from the community. One vertical video at a time.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          {isAuthenticated ? (
            <>
              <Button size="lg" asChild>
                <a href="/feed">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Videos
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/upload">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Upload Climb
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>Get Started</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/explore">Explore Routes</a>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why ClimbFlow?</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-blue-900/40 border-blue-800/50 hover:border-blue-600/50 transition">
            <CardHeader>
              <Play className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle>Vertical Video Feed</CardTitle>
              <CardDescription>Immersive full-screen climbing videos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                Swipe through climbing videos in a vertical feed similar to your favorite social apps. Optimized for mobile viewing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/40 border-blue-800/50 hover:border-blue-600/50 transition">
            <CardHeader>
              <MapPin className="h-8 w-8 text-cyan-400 mb-2" />
              <CardTitle>Route Discovery</CardTitle>
              <CardDescription>Find climbing spots with interactive maps</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                Explore climbing routes on a global map. Filter by location, difficulty grade, and climbing style.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/40 border-blue-800/50 hover:border-blue-600/50 transition">
            <CardHeader>
              <Users className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle>Community Learning</CardTitle>
              <CardDescription>Learn from climbers worldwide</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-300">
                Share your techniques, get feedback, and discover new climbing styles from the global climbing community.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Share Your Climb?</CardTitle>
            <CardDescription className="text-blue-100">
              Join thousands of climbers sharing their passion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              <Button size="lg" variant="secondary" asChild>
                <a href="/upload">Upload Your First Video</a>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" asChild>
                <a href="/signup">Create Your Account</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-800/30 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2026 ClimbFlow. Built for climbers, by climbers.</p>
        </div>
      </footer>
    </div>
  );
}
