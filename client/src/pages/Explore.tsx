import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const DIFFICULTY_GRADES_HUECO = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17"];
const DIFFICULTY_GRADES_YDS = ["5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a", "5.12b", "5.12c", "5.12d", "5.13a", "5.13b", "5.13c", "5.13d", "5.14a", "5.14b", "5.14c", "5.14d", "5.15a", "5.15b", "5.15c"];

interface SearchFilters {
  locationName: string;
  difficultyGrade: string;
  gradeSystem: "hueco" | "yds";
}

export default function Explore() {
  const [filters, setFilters] = useState<SearchFilters>({
    locationName: "",
    difficultyGrade: "",
    gradeSystem: "hueco",
  });

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    try {
      // TODO: Replace with actual tRPC call
      // const result = await trpc.routes.search.useQuery(filters);
      // setResults(result.data || []);
      setResults([]);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      locationName: "",
      difficultyGrade: "",
      gradeSystem: "hueco",
    });
    setResults([]);
    setHasSearched(false);
  };

  const difficultyGrades = filters.gradeSystem === "hueco" ? DIFFICULTY_GRADES_HUECO : DIFFICULTY_GRADES_YDS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Explore Routes</h1>
          <p className="text-gray-600">Search and discover climbing routes from the community</p>
        </div>

        {/* Search & Filter Card */}
        <Card className="shadow-lg mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Location Search */}
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., Fontainebleau, Boulder, Yosemite..."
                  value={filters.locationName}
                  onChange={(e) => handleFilterChange("locationName", e.target.value)}
                />
              </div>

              {/* Grade System Selection */}
              <div className="space-y-2">
                <label htmlFor="gradeSystem" className="text-sm font-medium">
                  Grade System
                </label>
                <Select value={filters.gradeSystem} onValueChange={(value) => handleFilterChange("gradeSystem", value as "hueco" | "yds")}>
                  <SelectTrigger id="gradeSystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hueco">Hueco (V0, V1, V2...)</SelectItem>
                    <SelectItem value="yds">YDS (5.8, 5.9, 5.10...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Grade Selection */}
              <div className="space-y-2">
                <label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty Grade
                </label>
                <Select value={filters.difficultyGrade} onValueChange={(value) => handleFilterChange("difficultyGrade", value)}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All grades</SelectItem>
                    {difficultyGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                {hasSearched && (
                  <Button type="button" variant="outline" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Results {results.length > 0 && `(${results.length})`}
            </h2>

            {results.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600 mb-4">No routes found matching your criteria</p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Try different filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((route) => (
                  <Card key={route.id} className="overflow-hidden hover:shadow-lg transition cursor-pointer">
                    {route.thumbnailUrl && (
                      <img src={route.thumbnailUrl} alt={route.name} className="w-full h-40 object-cover" />
                    )}
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{route.name}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {route.locationName}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className="bg-blue-600">{route.difficultyGrade}</Badge>
                          {route.tags && route.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {route.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{route.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Use the search and filters above to find climbing routes</p>
          </Card>
        )}
      </div>
    </div>
  );
}
