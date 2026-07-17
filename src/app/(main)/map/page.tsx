"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { SavedPlacesMap, type SavedMarker } from "@/components/map/SavedPlacesMap";

interface SavedPlaceMarkerRow {
  place_id: string;
  places: {
    name: string;
    category: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface SavedKakaoMarkerRow {
  id: string;
  place_name: string;
  category_name: string;
  latitude: number;
  longitude: number;
}

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [markers, setMarkers] = useState<SavedMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("saved_places")
        .select("place_id, places ( name, category, latitude, longitude )")
        .eq("user_id", user.id)
        .eq("type", "place")
        .returns<SavedPlaceMarkerRow[]>(),
      supabase
        .from("saved_kakao_places")
        .select("id, place_name, category_name, latitude, longitude")
        .eq("user_id", user.id)
        .eq("type", "food")
        .returns<SavedKakaoMarkerRow[]>(),
      supabase
        .from("saved_kakao_places")
        .select("id, place_name, category_name, latitude, longitude")
        .eq("user_id", user.id)
        .eq("type", "play")
        .returns<SavedKakaoMarkerRow[]>(),
    ]).then(([placeRes, foodRes, playRes]) => {
      if (cancelled) return;

      const placeMarkers: SavedMarker[] = (placeRes.data ?? [])
        .filter((row) => row.places?.latitude != null && row.places?.longitude != null)
        .map((row) => ({
          id: row.place_id,
          type: "place",
          name: row.places!.name,
          detail: row.places!.category,
          latitude: Number(row.places!.latitude),
          longitude: Number(row.places!.longitude),
        }));

      const toKakaoMarker =
        (type: "food" | "play") =>
        (row: SavedKakaoMarkerRow): SavedMarker => ({
          id: row.id,
          type,
          name: row.place_name,
          detail: row.category_name,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        });

      setMarkers([
        ...placeMarkers,
        ...(foodRes.data ?? []).map(toKakaoMarker("food")),
        ...(playRes.data ?? []).map(toKakaoMarker("play")),
      ]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (checkingAuth) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-[15px] font-semibold">로그인이 필요해요</p>
        <p className="text-[13.5px] text-text-muted">
          저장한 관광지·먹거리·놀거리는 로그인 후 지도로 볼 수 있어요
        </p>
        <Link href="/login">
          <Button variant="primary">로그인하러 가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-display font-bold text-2xl">저장한 곳 지도</p>
        <p className="mt-1.5 text-[13.5px] text-text-muted">
          하트로 저장한 관광지·먹거리·놀거리를 지도에서 한눈에 확인해보세요
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-[13.5px] text-text-muted">불러오는 중...</p>
      ) : markers.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-text-muted">
          아직 저장한 곳이 없어요. 하트를 눌러 저장해보세요
        </p>
      ) : (
        <SavedPlacesMap markers={markers} />
      )}
    </div>
  );
}
