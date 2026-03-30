import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Upload, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const DIFFICULTY_GRADES_HUECO = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16","V17"];
const DIFFICULTY_GRADES_YDS = ["5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a","5.14b","5.14c","5.14d","5.15a","5.15b","5.15c"];
const COMMON_TAGS = ["Dyno","Crimps","Slopers","Jugs","Pockets","Pinches","Mantle","Overhang","Slab","Traverse","Heel Hook","Toe Hook","Campus","Compression"];

const MAX_FILE_SIZE_MB = 500;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadVideo() {
  const { isAuthenticated, user } = useAuth();
  const [step, setStep] = useState<"form" | "uploading" | "success">("form");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    routeName: "",
    locationName: "",
    latitude: "",
    longitude: "",
    difficultyGrade: "",
    gradeSystem: "hueco" as "hueco" | "yds",
    description: "",
    tags: [] as string[],
    videoFile: null as File | null,
  });
  const [error, setError] = useState("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const uploadFileMutation = trpc.videos.uploadFile.useMutation();
  const createRouteMutation = trpc.routes.create.useMutation();
  const createVideoMutation = trpc.videos.create.useMutation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 px-4">
        <div className="text-center text-white space-y-4">
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="text-gray-300">You need to be logged in to upload videos.</p>
          <a href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition">
            Login
          </a>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["video/mp4", "video/quicktime"].includes(file.type)) {
      setError("Please select an MP4 or MOV video file");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setFormData((prev) => ({ ...prev, videoFile: file }));
    setVideoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Location detected!");
      },
      () => setError("Could not get location. Please enter manually.")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.videoFile) { setError("Please select a video file"); return; }
    if (!formData.latitude || !formData.longitude) { setError("Please provide location coordinates"); return; }
    if (!formData.difficultyGrade) { setError("Please select a difficulty grade"); return; }

    setStep("uploading");
    setUploadProgress(10);

    try {
      // 1. Convert video to base64 and upload
      setUploadProgress(20);
      const base64 = await fileToBase64(formData.videoFile);
      setUploadProgress(40);

      const { url: videoUrl } = await uploadFileMutation.mutateAsync({
        fileName: formData.videoFile.name,
        fileType: formData.videoFile.type,
        fileBase64: base64,
      });
      setUploadProgress(70);

      // 2. Create route record
      const routeResult = await createRouteMutation.mutateAsync({
        name: formData.routeName || formData.title,
        locationName: formData.locationName,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        difficultyGrade: formData.difficultyGrade,
        gradeSystem: formData.gradeSystem,
        tags: formData.tags,
        description: formData.description,
      });
      setUploadProgress(85);

      // 3. Create video record (routeId from insertId)
      const routeId = (routeResult as any).insertId ?? 1;
      await createVideoMutation.mutateAsync({
        routeId,
        title: formData.title || formData.routeName,
        description: formData.description,
        videoUrl,
      });
      setUploadProgress(100);

      // Invalidate feed cache
      utils.videos.getAll.invalidate();
      utils.routes.getAll.invalidate();

      setStep("success");
      toast.success("Video uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message ?? "Upload failed. Please try again.");
      setStep("form");
    }
  };

  const difficultyGrades = formData.gradeSystem === "hueco" ? DIFFICULTY_GRADES_HUECO : DIFFICULTY_GRADES_YDS;

  // ── Success state ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Climb Shared!</h2>
          <p className="text-gray-600">Your video has been uploaded and is now visible in the feed.</p>
          <div className="flex flex-col gap-3">
            <a href="/feed" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition text-center">
              Watch Feed
            </a>
            <button
              onClick={() => { setStep("form"); setFormData({ title:"",routeName:"",locationName:"",latitude:"",longitude:"",difficultyGrade:"",gradeSystem:"hueco",description:"",tags:[],videoFile:null }); setVideoPreview(""); }}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Uploading state ────────────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Uploading your climb...</h2>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-gray-500 text-sm">{uploadProgress}% complete</p>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="p-2 rounded-full hover:bg-gray-200 transition">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Climbing Video</h1>
            <p className="text-gray-500 text-sm">Share your latest ascent with the community</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Video Upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Video File (MP4 or MOV) *</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                  <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">MP4 or MOV · Max {MAX_FILE_SIZE_MB}MB</p>
                </div>
                {videoPreview && (
                  <div className="mt-3 rounded-xl overflow-hidden bg-black aspect-video">
                    <video src={videoPreview} className="w-full h-full object-contain" controls />
                  </div>
                )}
                {formData.videoFile && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {formData.videoFile.name} ({(formData.videoFile.size / 1024 / 1024).toFixed(1)}MB)
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-sm font-semibold text-gray-700">Video Title *</label>
                <Input id="title" name="title" placeholder="e.g., First V5 Send!" value={formData.title} onChange={handleChange} required />
              </div>

              {/* Route Name */}
              <div className="space-y-1.5">
                <label htmlFor="routeName" className="text-sm font-semibold text-gray-700">Route Name</label>
                <Input id="routeName" name="routeName" placeholder="e.g., The Crimper" value={formData.routeName} onChange={handleChange} />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label htmlFor="locationName" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Location Name *
                </label>
                <Input id="locationName" name="locationName" placeholder="e.g., Fontainebleau, France" value={formData.locationName} onChange={handleChange} required />
              </div>

              {/* Coordinates */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Coordinates *</label>
                  <button type="button" onClick={handleGetLocation} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Use my location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="latitude" type="number" step="0.000001" placeholder="Latitude (e.g., 48.4)" value={formData.latitude} onChange={handleChange} required />
                  <Input name="longitude" type="number" step="0.000001" placeholder="Longitude (e.g., 2.7)" value={formData.longitude} onChange={handleChange} required />
                </div>
              </div>

              {/* Grade System */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Grade System</label>
                  <Select value={formData.gradeSystem} onValueChange={(v) => setFormData((p) => ({ ...p, gradeSystem: v as "hueco"|"yds", difficultyGrade: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hueco">Hueco (V-scale)</SelectItem>
                      <SelectItem value="yds">YDS (5.x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Difficulty Grade *</label>
                  <Select value={formData.difficultyGrade} onValueChange={(v) => setFormData((p) => ({ ...p, difficultyGrade: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {difficultyGrades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={formData.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-semibold text-gray-700">Description</label>
                <Textarea id="description" name="description" placeholder="Share your experience, tips, or beta..." value={formData.description} onChange={handleChange} rows={3} />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl">
                <Upload className="mr-2 h-5 w-5" />
                Upload Climb
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
