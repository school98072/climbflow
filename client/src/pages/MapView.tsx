import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ArrowLeft, Play, Mountain } from "lucide-react";
import { trpc } from "@/lib/trpc";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths (bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function gradeColor(grade: string): string {
  const n = parseInt(grade.replace("V", ""), 10);
  if (isNaN(n)) return "#3b82f6";
  if (n <= 3) return "#22c55e";
  if (n <= 6) return "#eab308";
  if (n <= 9) return "#f97316";
  return "#ef4444";
}

function createGradeIcon(grade: string) {
  const color = gradeColor(grade);
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:white;font-size:10px;font-weight:700;padding:3px 6px;border-radius:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">${grade}</div>`,
    iconAnchor: [20, 10],
  });
}

// Auto-fit map to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [positions.length]);
  return null;
}

export default function MapView() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: routesData, isLoading, error } = trpc.routes.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const routes = (routesData ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    locationName: r.locationName,
    latitude: parseFloat(r.latitude),
    longitude: parseFloat(r.longitude),
    difficultyGrade: r.difficultyGrade,
    gradeSystem: r.gradeSystem,
    tags: (r.tags as string[]) ?? [],
    description: r.description,
  })).filter((r: any) => !isNaN(r.latitude) && !isNaN(r.longitude));

  const positions: [number, number][] = routes.map((r: any) => [r.latitude, r.longitude]);
  const selectedRoute = routes.find((r: any) => r.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
        <a href="/" className="p-2 rounded-full hover:bg-gray-100 transition">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </a>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Route Map</h1>
          <p className="text-xs text-gray-500">{routes.length} climbing spot{routes.length !== 1 ? "s" : ""}</p>
        </div>
        <a href="/explore" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          List view
        </a>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-[50vh] md:min-h-0">
          {error ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Failed to load routes</p>
            </div>
          ) : (
            <MapContainer
              center={[20, 0]}
              zoom={2}
              className="w-full h-full"
              style={{ zIndex: 0 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {positions.length > 0 && <FitBounds positions={positions} />}
              {routes.map((route: any) => (
                <Marker
                  key={route.id}
                  position={[route.latitude, route.longitude]}
                  icon={createGradeIcon(route.difficultyGrade)}
                  eventHandlers={{ click: () => setSelectedId(route.id) }}
                >
                  <Popup>
                    <div className="space-y-1 min-w-[140px]">
                      <p className="font-bold text-sm">{route.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{route.locationName}
                      </p>
                      <span
                        className="inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: gradeColor(route.difficultyGrade) }}
                      >
                        {route.difficultyGrade}
                      </span>
                      <div className="pt-1">
                        <a href="/feed" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <Play className="h-3 w-3" /> Watch video
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto flex-shrink-0 max-h-[40vh] md:max-h-none">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {routes.length} Route{routes.length !== 1 ? "s" : ""}
            </p>
          </div>

          {routes.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Mountain className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-gray-500 text-sm font-medium">No routes yet</p>
              <a href="/upload" className="text-xs text-blue-600 hover:underline">
                Upload the first climb
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {routes.map((route: any) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedId(route.id === selectedId ? null : route.id)}
                  className={`w-full text-left p-3 transition ${
                    selectedId === route.id ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{route.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{route.locationName}</span>
                      </p>
                      {route.tags && route.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {(route.tags as string[]).slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full text-white mt-0.5"
                      style={{ background: gradeColor(route.difficultyGrade) }}
                    >
                      {route.difficultyGrade}
                    </span>
                  </div>
                  {selectedId === route.id && (
                    <a
                      href="/feed"
                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Play className="h-3 w-3" /> Watch video
                    </a>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
