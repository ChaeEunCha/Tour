import "server-only";

export interface KakaoPlace {
  id: string;
  placeName: string;
  categoryName: string;
  categoryGroupCode: string;
  distance: number;
  addressName: string;
  roadAddressName: string;
  phone: string;
  placeUrl: string;
  longitude: number;
  latitude: number;
}

export interface NearbyPlaces {
  food: KakaoPlace[];
  play: KakaoPlace[];
}

interface KakaoCategorySearchDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  distance: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
}

interface KakaoCategorySearchResponse {
  documents: KakaoCategorySearchDocument[];
  meta: { total_count: number; is_end: boolean };
}

interface KakaoErrorResponse {
  errorType?: string;
  message?: string;
}

export class KakaoApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KakaoApiError";
  }
}

type CategoryGroupCode = "FD6" | "CE7" | "AT4";

async function categorySearch(
  categoryGroupCode: CategoryGroupCode,
  x: number,
  y: number,
  radius: number,
): Promise<KakaoPlace[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new KakaoApiError("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  url.searchParams.set("category_group_code", categoryGroupCode);
  url.searchParams.set("x", String(x));
  url.searchParams.set("y", String(y));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("sort", "distance");
  url.searchParams.set("size", "15");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  const data = (await res.json()) as KakaoCategorySearchResponse | KakaoErrorResponse;

  if (!res.ok) {
    const errorData = data as KakaoErrorResponse;
    throw new KakaoApiError(
      `카카오 로컬 API 오류: ${errorData.message ?? res.statusText}`,
    );
  }

  const body = data as KakaoCategorySearchResponse;
  return body.documents.map((doc) => ({
    id: doc.id,
    placeName: doc.place_name,
    categoryName: doc.category_name,
    categoryGroupCode: doc.category_group_code,
    distance: Number(doc.distance),
    addressName: doc.address_name,
    roadAddressName: doc.road_address_name,
    phone: doc.phone,
    placeUrl: doc.place_url,
    longitude: Number(doc.x),
    latitude: Number(doc.y),
  }));
}

export async function searchNearby(
  x: number,
  y: number,
  radius = 1000,
): Promise<NearbyPlaces> {
  const [restaurants, cafes, attractions] = await Promise.all([
    categorySearch("FD6", x, y, radius),
    categorySearch("CE7", x, y, radius),
    categorySearch("AT4", x, y, radius),
  ]);

  return {
    food: [...restaurants, ...cafes].sort((a, b) => a.distance - b.distance),
    play: attractions.sort((a, b) => a.distance - b.distance),
  };
}
