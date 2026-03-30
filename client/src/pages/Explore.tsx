import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, ArrowLeft, Play, Mountain } from "lucide-react";
import { trpc } from "@/lib/trpc";

const DIFFICULTY_GRADES_HUECO = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16","V17"];
const DIFFICULTY_GRADES_YDS = ["5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a","5.14b","5.14c","5.14d","5.15a","5.15b","5.15c"];

function gradeColor(grade: string): string {
  const n = parseInt(grade.replace("V", ""), 10);
  if (isNaN(n)) return "bg-blue-600";
  if (n <= 3) return "bg-green-500";
  if (n <= 6) return "bg-yellow-500";
  if (n <= 9) return "bg-orange-500";
  return "bg-red-600";
}

export default function Explore() {
  const [locationInput, setLocationInput] = useState("");
  const [gradeSystem, setGradeSystem] = useState<"hueco" | "yds">("hueco");
  const [difficultyGrade, setDifficultyGrade] = useState("all");
  const [submitted, setSubmitted] = useState(false);
  const [queryParams, setQueryParams] = useState<{
    locationName?: string;
    difficultyGrade?: string;
    gradeSystem?: "hueco" | "yds";
  }>({});

  const { data: results, isLoading, error } = trpc.routes.search.useQuery(queryParams, {
    enabled: submitted,
    refetchOnWindowFocus: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryParams({
      locationName: locationInput || undefined,
      difficultyGrade: difficultyGrade === "all" ? undefined : difficultyGrade || undefined,
      gradeSystem: gradeSystem,
    });
    setSubmitted(true);
  };

  const handleClear = () => {
    setLocationInput("");
    setDifficultyGrade("all");
    setGradeSystem("hueco");
    setQueryParams({});
    setSubmitted(false);
  };

  const difficultyGrades = gradeSystem === "hueco" ? DIFFICULTY_GRADES_HUECO : DIFFICULTY_GRADES_YDS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <a href="/" className="p-2 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Explore Routes</h1>
            <p className="text-xs text-gray-500">Find climbs by location or grade</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search Card */}
        <Card className="shadow-md">
          <CardContent className="p-5">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Location
                </label>
                <Input
                  placeholder="e.g., Fontainebleau, Boulder, Yosemite..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                />
              </div>

              {/* Grade System + Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Grade System</label>
                  <Select value={gradeSystem} onValueChange={(v) => { setGradeSystem(v as "hueco"|"yds"); setDifficultyGrade(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hueco">Hueco (V-scale)</SelectItem>
                      <SelectItem value="yds">YDS (5.x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Difficulty</label>
                  <Select value={difficultyGrade} onValueChange={setDifficultyGrade}>
                    <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All grades</SelectItem>
                      {difficultyGrades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...</>
                  ) : (
                    <><Search className="mr-2 h-4 w-4" />Search</>
                  )}
                </Button>
                {submitted && (
                  <Button type="button" variant="outline" onClick={handleClear}>Clear</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {submitted && (
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3">
              {isLoading ? "Searching..." : `${results?.length ?? 0} route${results?.length !== 1 ? "s" : ""} found`}
            </h2>

            {error && (
              <Card className="p-8 text-center">
                <p className="text-red-500">Search failed. Please try again.</p>
              </Card>
            )}

            {!isLoading && !error && results?.length === 0 && (
              <Card className="p-12 text-center">
                <Mountain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">No routes found</p>
                <p className="text-gray-400 text-sm mb-4">Try different filters or be the first to add this location!</p>
                <Button variant="outline" onClick={handleClear}>Clear Filters</Button>
              </Card>
            )}

            {!isLoading && results && results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((route: any) => (
                  <a key={route.id} href="/feed" className="block">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                      {/* Thumbnail */}
                      <div className="relative h-40 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden">
                        {route.thumbnailUrl ? (
                          <img
                            src={route.thumbnailUrl}
                            alt={route.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-10 w-10 text-gray-500" />
                          </div>
                        )}
                        {/* Grade badge */}
                        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${gradeColor(route.difficultyGrade)}`}>
                          {route.difficultyGrade}
                        </span>
                      </div>

                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{route.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {route.locationName}
                        </p>
                        {route.tags && Array.isArray(route.tags) && route.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {(route.tags as string[]).slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        {route.description && (
                          <p className="text-xs text-gray-400 line-clamp-2">{route.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Initial empty state */}
        {!submitted && (
          <div className="text-center py-16 text-gray-400">
            <Search className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Search for climbing routes</p>
            <p className="text-sm mt-1">Filter by location, grade system, or difficulty</p>
          </div>
        )}
      </div>
    </div>
  );
}
