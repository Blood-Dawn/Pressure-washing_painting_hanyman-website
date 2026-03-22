"use client";
// =============================================================================
// components/LiveMap.tsx
//
// Renders a live Leaflet/OpenStreetMap map showing the technician's current
// GPS position. Loaded entirely from CDN -- no npm package needed.
//
// HOW IT WORKS:
//   On mount, we inject the Leaflet CSS and JS tags from unpkg if they are
//   not already present in the document. Once the script loads we initialise
//   the map and drop a purple pin at the technician's coordinates.
//   Whenever the lat/lng props change (TrackingWidget polls every 30 s) the
//   marker smoothly pans to the new position.
//
// WHY CDN?
//   Leaflet uses `window` heavily and is awkward to tree-shake inside Next.js.
//   Loading it from CDN via a <script> tag and guarding with `window.L` is
//   simpler and avoids SSR issues entirely.
//
// WHO IMPORTS THIS FILE:
//   components/TrackingWidget.tsx  -- imported with next/dynamic + ssr:false
// =============================================================================

import { useEffect, useRef } from "react";

interface LiveMapProps {
  lat:             number;
  lng:             number;
  customerAddress: string; // shown in a tooltip on the destination pin (future)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletLib = any;

export default function LiveMap({ lat, lng }: LiveMapProps) {
  const mapDivRef      = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletLib>(null);
  const markerRef      = useRef<LeafletLib>(null);

  // ── First mount: inject Leaflet and initialise the map ────────────────────
  useEffect(() => {
    if (!mapDivRef.current) return;

    // Inject Leaflet CSS once
    if (!document.getElementById("leaflet-css")) {
      const link    = document.createElement("link");
      link.id       = "leaflet-css";
      link.rel      = "stylesheet";
      link.href     = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }

    function initMap(L: LeafletLib) {
      // Guard: map may already exist if React re-renders this component
      if (mapInstanceRef.current) return;

      const map = L.map(mapDivRef.current!, {
        zoomControl:       true,
        scrollWheelZoom:   false, // prevents accidental zoom while customer scrolls
        attributionControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom purple dot icon for the technician
      const techIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            position:relative;
            width:20px;height:20px;
            background:#7c3aed;
            border-radius:50%;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.45);
          ">
            <div style="
              position:absolute;
              top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:32px;height:32px;
              background:rgba(124,58,237,0.25);
              border-radius:50%;
              animation:pulse-ring 2s ease-out infinite;
            "></div>
          </div>
          <style>
            @keyframes pulse-ring{
              0%  {transform:translate(-50%,-50%) scale(0.5);opacity:1}
              80% {transform:translate(-50%,-50%) scale(2.2);opacity:0}
              100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}
            }
          </style>
        `,
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([lat, lng], { icon: techIcon })
        .addTo(map)
        .bindPopup("Your technician is here")
        .openPopup();

      mapInstanceRef.current = map;
      markerRef.current      = marker;
    }

    // If Leaflet JS is already on the page (e.g. hot reload) use it immediately
    if ((window as LeafletLib).L) {
      initMap((window as LeafletLib).L);
      return;
    }

    // Otherwise inject the script and wait for it to load
    const script    = document.createElement("script");
    script.id       = "leaflet-js";
    script.src      = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLEo=";
    script.crossOrigin = "anonymous";
    script.onload   = () => initMap((window as LeafletLib).L);
    document.head.appendChild(script);

    // Cleanup: destroy the Leaflet instance to avoid memory leaks
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current      = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty -- only run on first mount


  // ── Subsequent renders: pan to updated coordinates ────────────────────────
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    const latlng = [lat, lng] as [number, number];
    markerRef.current.setLatLng(latlng);
    mapInstanceRef.current.panTo(latlng, { animate: true, duration: 1 });
  }, [lat, lng]);


  return (
    <div
      ref={mapDivRef}
      style={{
        height:       "220px",
        width:        "100%",
        borderRadius: "12px",
        overflow:     "hidden",
        zIndex:       0,          // keep below any modals/nav
        position:     "relative",
      }}
    />
  );
}
