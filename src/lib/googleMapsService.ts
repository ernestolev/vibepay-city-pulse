import type { GeoPoint } from "./merchantData";

const MAPS_SCRIPT_ID = "vibepay-google-maps-script";
const PLACEHOLDER_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE";

type GoogleNamespace = typeof globalThis & {
  google?: {
    maps?: {
      DirectionsService: new () => DirectionsServiceLike;
      TravelMode: { WALKING: string };
      geometry?: { encoding?: { decodePath: (encoded: string) => LatLngLike[] } };
    };
  };
};

interface LatLngLike {
  lat: () => number;
  lng: () => number;
}

interface DirectionsResponseLike {
  routes?: Array<{
    overview_path?: LatLngLike[];
    overview_polyline?: { points: string } | string;
    legs?: Array<{
      steps?: Array<{ path?: LatLngLike[] }>;
    }>;
  }>;
}

interface DirectionsServiceLike {
  route(
    request: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      travelMode: string;
    },
    callback: (result: DirectionsResponseLike | null, status: string) => void,
  ): void;
}

let mapsLoadingPromise: Promise<GoogleNamespace["google"]> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<GoogleNamespace["google"]> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser environment"));
  }

  const win = window as GoogleNamespace;
  if (win.google?.maps?.DirectionsService) {
    return Promise.resolve(win.google);
  }

  if (mapsLoadingPromise) return mapsLoadingPromise;

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(win.google));
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps script failed to load")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&v=quarterly`;
    script.defer = true;
    script.onload = () => {
      const ready = (window as GoogleNamespace).google;
      if (!ready?.maps) {
        mapsLoadingPromise = null;
        reject(new Error("Google Maps loaded but namespace is empty"));
        return;
      }
      resolve(ready);
    };
    script.onerror = () => {
      mapsLoadingPromise = null;
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
}

/**
 * Fetch a real walking route between two coordinates using the Google Maps
 * JavaScript SDK (which avoids the CORS limitations of the REST endpoint).
 *
 * Throws if the API key is missing/placeholder, the SDK fails to load,
 * or the directions request comes back without a route. Callers should catch
 * and fall back to a straight-line interpolation.
 */
export async function getWalkingRoute(
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<GeoPoint[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey || apiKey === PLACEHOLDER_KEY) {
    throw new Error(
      "Missing VITE_GOOGLE_MAPS_API_KEY — falling back to straight-line interpolation.",
    );
  }

  const google = await loadGoogleMaps(apiKey);
  if (!google?.maps?.DirectionsService) {
    throw new Error("Google Maps SDK did not expose DirectionsService");
  }

  const directionsService = new google.maps.DirectionsService();

  const route = await new Promise<DirectionsResponseLike>((resolve, reject) => {
    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status !== "OK" || !result) {
          if (status === "REQUEST_DENIED") {
            const denyError = new Error(
              "Directions API not enabled in your Google Cloud project. Enable it at https://console.cloud.google.com/apis/library/directions-backend.googleapis.com",
            );
            (denyError as Error & { code?: string }).code = "DIRECTIONS_API_DISABLED";
            reject(denyError);
            return;
          }
          if (status === "OVER_QUERY_LIMIT") {
            reject(new Error("Directions quota exceeded for today. Check billing in Google Cloud Console."));
            return;
          }
          if (status === "ZERO_RESULTS") {
            reject(new Error("No walking route found between origin and destination."));
            return;
          }
          reject(new Error(`Directions request failed: ${status}`));
          return;
        }
        resolve(result);
      },
    );
  });

  const firstRoute = route.routes?.[0];
  if (!firstRoute) {
    throw new Error("Directions response had no routes");
  }

  const stepPath = firstRoute.legs?.[0]?.steps?.flatMap((s) => s.path ?? []) ?? [];
  const richPath = stepPath.length > 1 ? stepPath : (firstRoute.overview_path ?? []);

  if (richPath.length > 0) {
    return richPath.map((p) => ({ lat: p.lat(), lng: p.lng() }));
  }

  const encoded =
    typeof firstRoute.overview_polyline === "string"
      ? firstRoute.overview_polyline
      : firstRoute.overview_polyline?.points;

  if (encoded && google.maps.geometry?.encoding?.decodePath) {
    const decoded = google.maps.geometry.encoding.decodePath(encoded);
    return decoded.map((p) => ({ lat: p.lat(), lng: p.lng() }));
  }

  throw new Error("Directions response did not contain a usable path");
}

export const isGoogleMapsConfigured = () => {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return Boolean(k && k !== PLACEHOLDER_KEY);
};
