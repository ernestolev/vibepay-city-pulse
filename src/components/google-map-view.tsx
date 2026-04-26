import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsService";
import {
  type GeoPoint,
  type LocalMerchant,
  type VibeMatch,
} from "@/lib/merchantData";
import { useMerchants } from "@/lib/merchant-rules-context";

const CATEGORY_COLOR: Record<LocalMerchant["category"], string> = {
  cafe: "#7A4E2A",
  bakery: "#C98A4B",
  bistro: "#C84F2E",
  weinstube: "#6B2D5C",
  gelateria: "#E59A4D",
  boutique: "#3E5D7E",
};

const CLEAN_MAP_STYLES = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

interface GoogleMapViewProps {
  miaPosition: GeoPoint;
  /** Mia's *origin* (where she's standing when not walking). The hollow ring marker. */
  origin: GeoPoint;
  destination: GeoPoint | null;
  pathPoints: GeoPoint[];
  matchingVibes: VibeMatch[];
  isWalking: boolean;
  routeSource: "google" | "fallback" | null;
  onMerchantClick: (merchant: LocalMerchant) => void;
  onMapClick: (point: GeoPoint) => void;
  onLoadError: (err: Error) => void;
}

export function GoogleMapView({
  miaPosition,
  origin,
  destination,
  pathPoints,
  matchingVibes,
  isWalking,
  routeSource,
  onMerchantClick,
  onMapClick,
  onLoadError,
}: GoogleMapViewProps) {
  const merchants = useMerchants();
  const merchantsRef = useRef<LocalMerchant[]>(merchants);
  merchantsRef.current = merchants;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const googleRef = useRef<any>(null);

  const miaMarkerRef = useRef<any>(null);
  const miaLabelRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const merchantMarkersRef = useRef<Map<string, any>>(new Map());
  const routePolylineRef = useRef<any>(null);
  const routeOutlineRef = useRef<any>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      onLoadError(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
      return;
    }

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !google || !containerRef.current) return;
        googleRef.current = google;

        const map = new google.maps.Map(containerRef.current, {
          center: origin,
          zoom: 17,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#F4EEE2",
          styles: CLEAN_MAP_STYLES,
          tilt: 0,
        });
        mapRef.current = map;

        originMarkerRef.current = new google.maps.Marker({
          position: origin,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#FFFFFF",
            fillOpacity: 1,
            strokeColor: "#3E89FF",
            strokeWeight: 2,
          },
          title: "Mia · home",
          zIndex: 500,
        });

        miaMarkerRef.current = new google.maps.Marker({
          position: origin,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3E89FF",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          },
          title: "Mia",
          zIndex: 1000,
        });

        miaLabelRef.current = new google.maps.Marker({
          position: origin,
          map,
          icon: {
            path: "M 0,0",
            scale: 0,
          },
          label: { text: "Mia", color: "#3E89FF", fontWeight: "700", fontSize: "11px" },
          zIndex: 1001,
        });

        merchantsRef.current.forEach((m) => {
          const matches = m.vibesMatch.some((v) => matchingVibes.includes(v));
          const marker = new google.maps.Marker({
            position: m.position,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: matches ? 7 : 5,
              fillColor: CATEGORY_COLOR[m.category],
              fillOpacity: matches ? 1 : 0.55,
              strokeColor: "#FFFFFF",
              strokeWeight: 1.5,
            },
            title: `${m.name} · ${m.category}`,
            zIndex: matches ? 600 : 400,
          });
          marker.addListener("click", () => onMerchantClick(m));
          merchantMarkersRef.current.set(m.id, marker);
        });

        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        setIsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        onLoadError(err);
      });

    return () => {
      cancelled = true;
      merchantMarkersRef.current.forEach((m) => m.setMap(null));
      merchantMarkersRef.current.clear();
      miaMarkerRef.current?.setMap(null);
      miaLabelRef.current?.setMap(null);
      originMarkerRef.current?.setMap(null);
      destMarkerRef.current?.setMap(null);
      routePolylineRef.current?.setMap(null);
      routeOutlineRef.current?.setMap(null);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    miaMarkerRef.current?.setPosition(miaPosition);
    miaLabelRef.current?.setPosition(miaPosition);
  }, [miaPosition, isReady]);

  useEffect(() => {
    if (!isReady || !googleRef.current || !mapRef.current) return;
    const google = googleRef.current;
    const map = mapRef.current;

    if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
      destMarkerRef.current = null;
    }
    if (destination) {
      destMarkerRef.current = new google.maps.Marker({
        position: destination,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#EC0000",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        title: "Destination",
        zIndex: 800,
      });
    }
  }, [destination, isReady]);

  useEffect(() => {
    if (!isReady || !googleRef.current || !mapRef.current) return;
    const google = googleRef.current;
    const map = mapRef.current;

    routePolylineRef.current?.setMap(null);
    routeOutlineRef.current?.setMap(null);
    routePolylineRef.current = null;
    routeOutlineRef.current = null;

    if (pathPoints.length > 1) {
      const isFallback = routeSource === "fallback";

      routeOutlineRef.current = new google.maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor: "#FFFFFF",
        strokeOpacity: 0.9,
        strokeWeight: 8,
        zIndex: 100,
        map,
      });

      routePolylineRef.current = new google.maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor: isFallback ? "#F59E0B" : "#3E89FF",
        strokeOpacity: isFallback ? 0.85 : 0.95,
        strokeWeight: 5,
        icons: isFallback
          ? [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 1,
                  scale: 3,
                },
                offset: "0",
                repeat: "12px",
              },
            ]
          : undefined,
        zIndex: 200,
        map,
      });

      if (!isWalking) {
        const bounds = new google.maps.LatLngBounds();
        pathPoints.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
      }
    } else {
      map.panTo(origin);
      map.setZoom(17);
    }
  }, [pathPoints, routeSource, isReady, isWalking, origin]);

  useEffect(() => {
    if (!isReady) return;
    originMarkerRef.current?.setPosition(origin);
  }, [origin, isReady]);

  useEffect(() => {
    if (!isReady || !googleRef.current) return;
    const google = googleRef.current;
    merchants.forEach((m) => {
      const marker = merchantMarkersRef.current.get(m.id);
      if (!marker) return;
      const matches = m.vibesMatch.some((v) => matchingVibes.includes(v));
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: matches ? 7 : 5,
        fillColor: CATEGORY_COLOR[m.category],
        fillOpacity: matches ? 1 : 0.55,
        strokeColor: "#FFFFFF",
        strokeWeight: 1.5,
      });
      marker.setZIndex(matches ? 600 : 400);
    });
  }, [matchingVibes, isReady, merchants]);

  return <div ref={containerRef} className="h-[260px] w-full" aria-label="Stuttgart Old Town live map" />;
}
