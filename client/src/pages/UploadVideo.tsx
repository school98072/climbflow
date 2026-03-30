import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Upload, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const DIFFICULTY_GRADES_HUECO = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17"];
const DIFFICULTY_GRADES_YDS = ["5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a", "5.12b", "5.12c", "5.12d", "5.13a", "5.13b", "5.13c", "5.13d", "5.14a", "5.14b", "5.14c", "5.14d", "5.15a", "5.15b", "5.15c"];
const COMMON_TAGS = ["Dyno", "Crimps", "Slopers", "Jugs", "Pockets", "Pinches", "Mantle", "Overhang", "Slab", "Traverse"];

export default function UploadVideo() {
  const [formData, setFormData] = useState({
    title: "",
    routeName: "",
    locationName: "",
    latitude: "",
    longitude: "",
    difficultyGrade: "",
    gradeSystem: "hueco",
    description: "",
    tags: [] as string[],
    videoFile: null as File | null,
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["video/mp4", "video/quicktime"].includes(file.type)) {
        setError("Please select an MP4 or MOV video file");
        return;
      }
      setFormData((prev) => ({ ...prev, videoFile: file }));
      setVideoPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.videoFile) {
      setError("Please select a video file");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError("Please provide location coordinates");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement video upload to Supabase Storage
      // TODO: Create route and video records in database
      console.log("Upload attempt:", formData);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyGrades = formData.gradeSystem === "hueco" ? DIFFICULTY_GRADES_HUECO : DIFFICULTY_GRADES_YDS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold">Upload Climbing Video</CardTitle>
            <CardDescription>Share your latest ascent with the community</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Video Upload Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Video File (MP4 or MOV)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
                    onChange={handleVideoChange}
                    disabled={isLoading}
                    className="hidden"
                    id="videoInput"
                  />
                  <label htmlFor="videoInput" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">MP4 or MOV up to 500MB</p>
                  </label>
                </div>
                {videoPreview && (
                  <div className="mt-4 rounded-lg overflow-hidden bg-black h-48">
                    <video src={videoPreview} className="w-full h-full object-cover" controls />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Video Title
                </label>
                <Input id="title" name="title" placeholder="e.g., First V5 Send!" value={formData.title} onChange={handleChange} required disabled={isLoading} />
              </div>

              {/* Route Name */}
              <div className="space-y-2">
                <label htmlFor="routeName" className="text-sm font-medium">
                  Route Name
                </label>
                <Input id="routeName" name="routeName" placeholder="e.g., The Crimper" value={formData.routeName} onChange={handleChange} required disabled={isLoading} />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label htmlFor="locationName" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Name
                </label>
                <Input id="locationName" name="locationName" placeholder="e.g., Fontainebleau, France" value={formData.locationName} onChange={handleChange} required disabled={isLoading} />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="latitude" className="text-sm font-medium">
                    Latitude
                  </label>
                  <Input id="latitude" name="latitude" type="number" step="0.00001" placeholder="48.4" value={formData.latitude} onChange={handleChange} required disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="longitude" className="text-sm font-medium">
                    Longitude
                  </label>
                  <Input id="longitude" name="longitude" type="number" step="0.00001" placeholder="2.7" value={formData.longitude} onChange={handleChange} required disabled={isLoading} />
                </div>
              </div>

              {/* Grade System */}
              <div className="space-y-2">
                <label htmlFor="gradeSystem" className="text-sm font-medium">
                  Grade System
                </label>
                <Select value={formData.gradeSystem} onValueChange={(value) => handleSelectChange("gradeSystem", value)}>
                  <SelectTrigger id="gradeSystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hueco">Hueco (V0, V1, V2...)</SelectItem>
                    <SelectItem value="yds">YDS (5.8, 5.9, 5.10...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Grade */}
              <div className="space-y-2">
                <label htmlFor="difficultyGrade" className="text-sm font-medium">
                  Difficulty Grade
                </label>
                <Select value={formData.difficultyGrade} onValueChange={(value) => handleSelectChange("difficultyGrade", value)}>
                  <SelectTrigger id="difficultyGrade">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={formData.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea id="description" name="description" placeholder="Share your experience, tips, or beta..." value={formData.description} onChange={handleChange} disabled={isLoading} rows={4} />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
