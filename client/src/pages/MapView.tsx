import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface RouteMarker {
  id: number;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  difficultyGrade: string;
  gradeSystem: string;
  tags?: string[];
}

export default function MapView() {
  const [routes, setRoutes] = useState<RouteMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RouteMarker | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        // TODO: Replace with actual tRPC call to fetch all routes with coordinates
        // const result = await trpc.routes.search.useQuery({});
        // setRoutes(result.data || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch routes:", error);
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  // Default center (world view)
  const defaultCenter: LatLngExpression = [20, 0];
  const defaultZoom = 2;

  // Calculate bounds if routes exist
  let center: LatLngExpression = defaultCenter;
  let zoom = defaultZoom;

  if (routes.length > 0) {
    const lats = routes.map((r) => r.latitude);
    const lngs = routes.map((r) => r.longitude);
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    center = [avgLat, avgLng];
    zoom = routes.length === 1 ? 12 : 6;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer center={center as any} zoom={zoom} className="w-full h-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {routes.map((route) => (
            <Marker
              key={route.id}
              position={[route.latitude, route.longitude] as any}
              eventHandlers={{
                click: () => setSelectedRoute(route),
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold">{route.name}</p>
                  <p className="text-sm text-gray-600">{route.locationName}</p>
                  <Badge className="text-xs">{route.difficultyGrade}</Badge>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Sidebar - Route Details */}
      <div className="w-full md:w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Routes ({routes.length})</h2>
        </div>

        {routes.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No routes found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {routes.map((route) => (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`p-4 cursor-pointer transition ${
                  selectedRoute?.id === route.id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-1">{route.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {route.locationName}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-blue-600 text-xs">{route.difficultyGrade}</Badge>
                  {route.tags && route.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
