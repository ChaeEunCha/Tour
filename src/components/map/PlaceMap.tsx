"use client";

import { useEffect, useRef } from "react";
import { loadKakaoMapsSdk } from "@/lib/kakao/loadKakaoMapsSdk";
import type { KakaoPlace } from "@/lib/kakao/local";

const MARKER_COLORS = {
  place: "#1E8A82",
  food: "#F2704F",
  play: "#2E9E5B",
} as const;

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

interface PlaceMapProps {
  place: { title: string; latitude: number; longitude: number };
  food: KakaoPlace[];
  play: KakaoPlace[];
}

export function PlaceMap({ place, food, play }: PlaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const markers: InstanceType<typeof window.kakao.maps.Marker>[] = [];

    loadKakaoMapsSdk().then((kakaoSdk) => {
      if (cancelled || !containerRef.current) return;

      const center = new kakaoSdk.maps.LatLng(place.latitude, place.longitude);
      const map = new kakaoSdk.maps.Map(containerRef.current, { center, level: 5 });

      const addMarker = (
        lat: number,
        lng: number,
        color: string,
        label: string,
        detail?: string,
      ) => {
        const position = new kakaoSdk.maps.LatLng(lat, lng);
        const marker = new kakaoSdk.maps.Marker({
          map,
          position,
          image: createMarkerImage(kakaoSdk, color),
          title: label,
        });
        const safeLabel = escapeHtml(label);
        const safeDetail = detail ? escapeHtml(detail) : undefined;
        const info = new kakaoSdk.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;">${safeLabel}${
            safeDetail ? `<br/>${safeDetail}` : ""
          }</div>`,
        });
        kakaoSdk.maps.event.addListener(marker, "click", () => info.open(map, marker));
        markers.push(marker);
      };

      addMarker(place.latitude, place.longitude, MARKER_COLORS.place, place.title);

      for (const item of food) {
        addMarker(
          item.latitude,
          item.longitude,
          MARKER_COLORS.food,
          item.placeName,
          `${Math.round(item.distance)}m · ${item.categoryName}`,
        );
      }

      for (const item of play) {
        addMarker(
          item.latitude,
          item.longitude,
          MARKER_COLORS.play,
          item.placeName,
          `${Math.round(item.distance)}m · ${item.categoryName}`,
        );
      }
    });

    return () => {
      cancelled = true;
      for (const marker of markers) marker.setMap(null);
    };
  }, [place, food, play]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="h-80 w-full rounded-[12px] border border-border" />
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
