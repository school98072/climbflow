import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Loader2,
  Upload,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Film,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTY_GRADES_HUECO = [
  "V0","V1","V2","V3","V4","V5","V6","V7","V8","V9",
  "V10","V11","V12","V13","V14","V15","V16","V17",
];
const DIFFICULTY_GRADES_YDS = [
  "5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
  "5.15a","5.15b","5.15c",
];
const COMMON_TAGS = [
  "Dyno","Crimps","Slopers","Jugs","Pockets","Pinches",
  "Mantle","Overhang","Slab","Traverse","Heel Hook","Toe Hook",
  "Campus","Compression",
];
const MAX_FILE_SIZE_MB = 500;

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "form" | "uploading" | "success";
interface FormState {
  title: string;
  routeName: string;
  locationName: string;
  latitude: string;
  longitude: string;
  difficultyGrade: string;
  gradeSystem: "hueco" | "yds";
  description: string;
  tags: string[];
  videoFile: File | null;
}

const INITIAL_FORM: FormState = {
  title: "",
  routeName: "",
  locationName: "",
  latitude: "",
  longitude: "",
  difficultyGrade: "",
  gradeSystem: "hueco",
  description: "",
  tags: [],
  videoFile: null,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function UploadVideo() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const getUploadTokenMutation = trpc.videos.getSupabaseUploadToken.useMutation();
  const createRouteMutation = trpc.routes.create.useMutation();
  const createVideoMutation = trpc.videos.create.useMutation();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
        <div className="text-center text-white space-y-5 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Film className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="text-gray-400 text-sm">You need to be logged in to share your climbs.</p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            Login to Upload
          </a>
        </div>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Accept mp4 and mov (quicktime)
    const validTypes = ["video/mp4", "video/quicktime", "video/mov"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|MOV|MP4)$/i)) {
      setError("Please select an MP4 or MOV video file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size must be under ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setFormData((prev) => ({ ...prev, videoFile: file }));
    setVideoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Location detected!");
      },
      () => setError("Could not get location. Please enter coordinates manually.")
    );
  };

  // ── Submit: Supabase Storage direct upload ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.videoFile) { setError("Please select a video file."); return; }
    if (!formData.latitude || !formData.longitude) { setError("Please provide location coordinates."); return; }
    if (!formData.difficultyGrade) { setError("Please select a difficulty grade."); return; }
    if (!formData.locationName.trim()) { setError("Please enter a location name."); return; }

    setStep("uploading");
    setUploadProgress(5);

    try {
      // ── Step 1: Get Supabase signed upload URL from backend ──────────────────
      setProgressLabel("Preparing secure upload...");
      setUploadProgress(10);

      const { signedUrl, publicUrl } = await getUploadTokenMutation.mutateAsync({
        fileName: formData.videoFile.name,
        fileType: formData.videoFile.type || "video/mp4",
      });

      // ── Step 2: Upload video directly to Supabase Storage ───────────────────
      // Uses the signed URL — completely bypasses Cloud Run (no 32 MB limit)
      setProgressLabel("Uploading video to Supabase Storage...");
      setUploadProgress(15);

      const videoUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 60) + 15;
            setUploadProgress(pct);
            const mb = (evt.loaded / 1024 / 1024).toFixed(1);
            const total = (evt.total / 1024 / 1024).toFixed(1);
            setProgressLabel(`Uploading... ${mb} / ${total} MB`);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(publicUrl);
          } else {
            reject(
              new Error(
                `Upload failed (HTTP ${xhr.status}). ${xhr.responseText.slice(0, 200)}`
              )
            );
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload. Please check your connection and try again."))
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload was cancelled."))
        );

        // Supabase signed upload URL accepts PUT with the raw file body
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", formData.videoFile!.type || "video/mp4");
        xhr.send(formData.videoFile);
      });

      setUploadProgress(78);

      // ── Step 3: Create route record ──────────────────────────────────────────
      setProgressLabel("Saving route information...");
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
      setUploadProgress(90);

      // ── Step 4: Create video record ──────────────────────────────────────────
      setProgressLabel("Finalizing your climb...");
      const routeId = (routeResult as any).insertId ?? 1;
      await createVideoMutation.mutateAsync({
        routeId,
        title: formData.title || formData.routeName,
        description: formData.description,
        videoUrl,
      });
      setUploadProgress(100);

      // Invalidate feed caches
      utils.videos.getAll.invalidate();
      utils.routes.getAll.invalidate();

      setStep("success");
      toast.success("Climb shared successfully! 🧗");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message ?? "Upload failed. Please try again.");
      setStep("form");
    }
  };

  const difficultyGrades =
    formData.gradeSystem === "hueco" ? DIFFICULTY_GRADES_HUECO : DIFFICULTY_GRADES_YDS;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Climb Shared! 🧗</h2>
          <p className="text-gray-400">
            Your climb has been uploaded and is now visible in the feed.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/feed">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                View Feed
              </Button>
            </Link>
            <Button
              variant="outline"
              className="rounded-full px-6 border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                setFormData(INITIAL_FORM);
                setVideoPreview("");
                setStep("form");
              }}
            >
              Upload Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload progress screen ──────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Uploading Climb</h2>
            <p className="text-gray-400 text-sm">{progressLabel}</p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-blue-400 font-semibold text-lg">{uploadProgress}%</p>
          <p className="text-gray-500 text-xs">
            Video is uploading directly to Supabase Storage — large files supported
          </p>
        </div>
      </div>
    );
  }

  // ── Form screen ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Link href="/feed">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
        </Link>
        <h1 className="text-white font-bold text-lg">Share Your Climb</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Video File ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Video File <span className="text-red-400">*</span>
                <span className="text-gray-500 font-normal ml-2">MP4 or MOV, up to 500 MB</span>
              </label>

              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-64">
                  <video
                    src={videoPreview}
                    className="w-full h-full object-contain"
                    controls
                    muted
                    playsInline
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVideoPreview("");
                      setFormData((p) => ({ ...p, videoFile: null }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {formData.videoFile
                      ? `${(formData.videoFile.size / 1024 / 1024).toFixed(1)} MB`
                      : ""}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium">Tap to select video</p>
                    <p className="text-gray-500 text-sm mt-1">MP4 or MOV • Max 500 MB</p>
                  </div>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov,.MOV,.MP4"
                onChange={handleVideoChange}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* ── Route Info ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Route Information</h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Video Title <span className="text-red-400">*</span>
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Midnight Lightning Flash"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Route Name</label>
                <Input
                  name="routeName"
                  value={formData.routeName}
                  onChange={handleChange}
                  placeholder="e.g., Midnight Lightning"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Beta, conditions, tips..."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Difficulty ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Difficulty Grade</h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, gradeSystem: "hueco", difficultyGrade: "" }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.gradeSystem === "hueco"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/15"
                  }`}
                >
                  Hueco (V-Scale)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, gradeSystem: "yds", difficultyGrade: "" }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.gradeSystem === "yds"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/15"
                  }`}
                >
                  YDS (5.x)
                </button>
              </div>

              <Select
                value={formData.difficultyGrade}
                onValueChange={(v) => setFormData((p) => ({ ...p, difficultyGrade: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-blue-500">
                  <SelectValue placeholder="Select grade..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 max-h-60">
                  {difficultyGrades.map((grade) => (
                    <SelectItem key={grade} value={grade} className="text-white hover:bg-white/10 focus:bg-white/10">
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* ── Location ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold">Location</h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Location Name <span className="text-red-400">*</span>
                </label>
                <Input
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Yosemite Valley, Camp 4"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Latitude <span className="text-red-400">*</span>
                  </label>
                  <Input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="37.7749"
                    type="number"
                    step="any"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Longitude <span className="text-red-400">*</span>
                  </label>
                  <Input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="-122.4194"
                    type="number"
                    step="any"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                className="w-full border-white/20 text-white hover:bg-white/10 gap-2"
              >
                <MapPin className="h-4 w-4" />
                Use My Current Location
              </Button>
            </CardContent>
          </Card>

          {/* ── Tags ── */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-white font-semibold">Move Tags</h3>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.tags.includes(tag)
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/15"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} className="bg-blue-600/30 text-blue-300 border-blue-500/30 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-blue-500/25 transition-all"
            disabled={!formData.videoFile || !formData.title || !formData.difficultyGrade}
          >
            <Upload className="h-5 w-5 mr-2" />
            Share Climb
          </Button>
        </form>
      </div>
    </div>
  );
}
