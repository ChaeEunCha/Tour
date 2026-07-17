"use client";

import { useEffect, useRef } from "react";
import { loadKakaoMapsSdk } from "@/lib/kakao/loadKakaoMapsSdk";

const MARKER_COLORS = {
  place: "#1E8A82",
  food: "#F2704F",
  play: "#2E9E5B",
} as const;

const DEFAULT_CENTER = { latitude: 36.5, longitude: 127.8 };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMarkerImage(kakaoSdk: typeof window.kakao, color: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
    `<path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>` +
    `<circle cx="16" cy="16" r="6" fill="#fff"/></svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new kakaoSdk.maps.MarkerImage(src, new kakaoSdk.maps.Size(32, 40));
}

export interface SavedMarker {
  id: string;
  type: "place" | "food" | "play";
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

export function SavedPlacesMap({ markers }: { markers: SavedMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const kakaoMarkers: InstanceType<typeof window.kakao.maps.Marker>[] = [];

    loadKakaoMapsSdk().then((kakaoSdk) => {
      if (cancelled || !containerRef.current) return;

      const center =
        markers.length > 0
          ? new kakaoSdk.maps.LatLng(markers[0].latitude, markers[0].longitude)
          : new kakaoSdk.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude);
      const map = new kakaoSdk.maps.Map(containerRef.current, {
        center,
        level: markers.length > 0 ? 5 : 13,
      });

      const bounds = new kakaoSdk.maps.LatLngBounds();

      for (const item of markers) {
        const position = new kakaoSdk.maps.LatLng(item.latitude, item.longitude);
        bounds.extend(position);

        const marker = new kakaoSdk.maps.Marker({
          map,
          position,
          image: createMarkerImage(kakaoSdk, MARKER_COLORS[item.type]),
          title: item.name,
        });
        const info = new kakaoSdk.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;">${escapeHtml(item.name)}${
            item.detail ? `<br/>${escapeHtml(item.detail)}` : ""
          }</div>`,
        });
        kakaoSdk.maps.event.addListener(marker, "click", () => info.open(map, marker));
        kakaoMarkers.push(marker);
      }

      if (markers.length > 1) {
        map.setBounds(bounds);
      }
    });

    return () => {
      cancelled = true;
      for (const marker of kakaoMarkers) marker.setMap(null);
    };
  }, [markers]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="h-[60vh] min-h-80 w-full rounded-[12px] border border-border"
      />
      <div className="flex gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.place }}
          />
          관광지
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.food }}
          />
          음식점·카페
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.play }}
          />
          놀거리
        </span>
      </div>
    </div>
  );
}
