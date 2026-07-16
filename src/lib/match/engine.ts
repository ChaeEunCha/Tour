import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccuracyInfo, type AccuracyBand } from "./accuracy";

export type MatchMode = "exact" | "similar";

export interface PlaceMatch {
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  thumbnailUrl: string | null;
  similarity: number;
  accuracyPercent: number;
  band: AccuracyBand;
  message: string;
}

const MATCH_COUNT: Record<MatchMode, number> = {
  exact: 1,
  similar: 3,
};

export function matchCountForMode(mode: MatchMode): number {
  return MATCH_COUNT[mode];
}

// pgvector 코사인 유사도 검색(match_places RPC) 결과에 관광지 상세 정보를 조인해
// 화면에 바로 표시할 수 있는 형태로 변환한다.
export async function findMatchingPlaces(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  mode: MatchMode
): Promise<PlaceMatch[]> {
  const { data: matches, error: rpcError } = await supabase.rpc(
    "match_places",
    {
      query_embedding: queryEmbedding,
      match_count: matchCountForMode(mode),
    }
  );

  if (rpcError) {
    throw new Error(`벡터 유사도 검색 실패: ${rpcError.message}`);
  }
  if (!matches || matches.length === 0) {
    return [];
  }

  const placeIds = matches.map((m: { place_id: string }) => m.place_id);

  const [{ data: places, error: placesError }, { data: images }] =
    await Promise.all([
      supabase
        .from("places")
        .select("id, name, category, address")
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
