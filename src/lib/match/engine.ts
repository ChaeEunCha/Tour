import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccuracyInfo, type AccuracyBand } from "./accuracy";

export type MatchMode = "exact" | "similar";

export interface PlaceMatch {
  placeId: string;
  tourContentId: string;
  name: string;
  category: string | null;
  address: string | null;
  thumbnailUrl: string | null;
  similarity: number;
  accuracyPercent: number;
  band: AccuracyBand;
  message: string;
}

// similar 모드는 1위(가장 정확히 일치하는 곳)를 결과 화면 상단에 별도로 보여주고,
// 2~4위를 "비슷한 다른 후보" 목록으로 보여주기 위해 4건을 가져온다.
const MATCH_COUNT: Record<MatchMode, number> = {
  exact: 1,
  similar: 4,
};

export function matchCountForMode(mode: MatchMode): number {
  return MATCH_COUNT[mode];
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
}

// 업로드 사진에 EXIF GPS가 남아있으면 촬영 위치 근처 반경으로 후보를 좁혀서
// 코사인 유사도를 매긴다 — 숲/공원처럼 CLIP이 헷갈려하는 장소들도 "전국 어디"가
// 아니라 "이 근처 어디"로만 비교하면 엉뚱한 지역의 결과가 나올 일이 없다.
// 반경 안에 place_embeddings가 하나도 없으면(그 지역 데이터 부족, GPS 오차 등)
// 점점 넓혀보다가 최종적으로 위치 제약 없는 전국 검색으로 폴백한다.
const GPS_SEARCH_RADII_KM = [5, 20, 50];

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 위도 1도 ≈ 111km, 경도 1도는 위도에 따라 좁아지므로 cos(lat) 보정.
function boundingBox(gps: GpsLocation, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta =
    radiusKm / (111 * Math.max(0.01, Math.cos((gps.latitude * Math.PI) / 180)));
  return {
    minLat: gps.latitude - latDelta,
    maxLat: gps.latitude + latDelta,
    minLng: gps.longitude - lngDelta,
    maxLng: gps.longitude + lngDelta,
  };
}

// match_places_near RPC가 PostgREST 스키마 캐시에 아직 안 잡혀 있거나(마이그레이션
// 직후 흔한 상황) 그 외 이유로 실패하면, places/place_embeddings 일반 조회 +
// 코사인 유사도 직접 계산으로 같은 결과를 앱 코드에서 재현한다.
async function matchPlacesNearInApp(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  gps: GpsLocation,
  radiusKm: number,
  matchCount: number
) {
  const box = boundingBox(gps, radiusKm);
  const { data: nearbyPlaces } = await supabase
    .from("places")
    .select("id")
    .gte("latitude", box.minLat)
    .lte("latitude", box.maxLat)
    .gte("longitude", box.minLng)
    .lte("longitude", box.maxLng);

  if (!nearbyPlaces || nearbyPlaces.length === 0) return null;
  const placeIds = nearbyPlaces.map((p) => p.id);

  const { data: embeddingRows } = await supabase
    .from("place_embeddings")
    .select("place_id, embedding")
    .in("place_id", placeIds);

  if (!embeddingRows || embeddingRows.length === 0) return null;

  const bestByPlace = new Map<string, number>();
  for (const row of embeddingRows as { place_id: string; embedding: string }[]) {
    const vec = JSON.parse(row.embedding) as number[];
    const similarity = cosineSimilarity(queryEmbedding, vec);
    const prev = bestByPlace.get(row.place_id) ?? -Infinity;
    if (similarity > prev) bestByPlace.set(row.place_id, similarity);
  }

  return Array.from(bestByPlace.entries())
    .map(([place_id, similarity]) => ({ place_id, similarity }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

async function matchPlacesNear(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  gps: GpsLocation,
  matchCount: number
) {
  let rpcAvailable = true;
  for (const radiusKm of GPS_SEARCH_RADII_KM) {
    if (rpcAvailable) {
      const { data, error } = await supabase.rpc("match_places_near", {
        query_embedding: queryEmbedding,
        center_lat: gps.latitude,
        center_lng: gps.longitude,
        radius_km: radiusKm,
        match_count: matchCount,
      });
      if (!error) {
        if (data && data.length > 0) return data;
        continue;
      }
      // RPC 자체가 없거나(스키마 캐시 미갱신) 호출에 실패하면 이번 검색은 계속
      // 앱 코드 폴백으로 진행한다.
      rpcAvailable = false;
    }

    const appResult = await matchPlacesNearInApp(
      supabase,
      queryEmbedding,
      gps,
      radiusKm,
      matchCount
    );
    if (appResult && appResult.length > 0) return appResult;
  }
  return null;
}

// pgvector 코사인 유사도 검색(match_places RPC) 결과에 관광지 상세 정보를 조인해
// 화면에 바로 표시할 수 있는 형태로 변환한다.
export async function findMatchingPlaces(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  mode: MatchMode,
  gps?: GpsLocation
): Promise<PlaceMatch[]> {
  const matchCount = matchCountForMode(mode);

  const nearMatches = gps
    ? await matchPlacesNear(supabase, queryEmbedding, gps, matchCount)
    : null;

  let matches = nearMatches;
  if (!matches) {
    const { data, error: rpcError } = await supabase.rpc("match_places", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });
    if (rpcError) {
      throw new Error(`벡터 유사도 검색 실패: ${rpcError.message}`);
    }
    matches = data;
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  const placeIds = matches.map((m: { place_id: string }) => m.place_id);

  const [{ data: places, error: placesError }, { data: images }] =
    await Promise.all([
      supabase
        .from("places")
        .select("id, tour_content_id, name, category, address")
        .in("id", placeIds),
      supabase
        .from("place_images")
        .select("place_id, image_url")
        .in("place_id", placeIds),
    ]);

  if (placesError) {
    throw new Error(`관광지 정보 조회 실패: ${placesError.message}`);
  }

  const placeById = new Map((places ?? []).map((p) => [p.id, p]));
  const thumbnailByPlace = new Map<string, string>();
  for (const img of images ?? []) {
    if (!thumbnailByPlace.has(img.place_id)) {
      thumbnailByPlace.set(img.place_id, img.image_url);
    }
  }

  return matches.map((m: { place_id: string; similarity: number }) => {
    const place = placeById.get(m.place_id);
    const accuracy = getAccuracyInfo(m.similarity);
    return {
      placeId: m.place_id,
      tourContentId: place?.tour_content_id ?? "",
      name: place?.name ?? "알 수 없는 장소",
      category: place?.category ?? null,
      address: place?.address ?? null,
      thumbnailUrl: thumbnailByPlace.get(m.place_id) ?? null,
      similarity: m.similarity,
      accuracyPercent: accuracy.percent,
      band: accuracy.band,
      message: accuracy.message,
    };
  });
}
