import type { TourApiFlatError, TourApiResponse } from "./types";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";

export class TourApiError extends Error {
  resultCode?: string;

  constructor(message: string, resultCode?: string) {
    super(message);
    this.name = "TourApiError";
    this.resultCode = resultCode;
  }
}

export async function tourApiFetch<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<{ item: T[]; totalCount: number }> {
  const apiKey = process.env.TOUR_API_KEY;
  if (!apiKey) {
    throw new TourApiError("TOUR_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const url = new URL(`${TOUR_API_BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "WhereIsIt");
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", params.numOfRows ?? "10");
  url.searchParams.set("pageNo", params.pageNo ?? "1");
  for (const [key, value] of Object.entries(params)) {
    if (key === "numOfRows" || key === "pageNo") continue;
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new TourApiError(`TourAPI 요청 실패: HTTP ${res.status}`);
  }

  const data = (await res.json()) as TourApiResponse<T> | TourApiFlatError;

  if ("resultCode" in data && !("response" in data)) {
    throw new TourApiError(`TourAPI 오류: ${data.resultMsg}`, data.resultCode);
  }

  const { header, body } = (data as TourApiResponse<T>).response;
  if (header.resultCode !== "0000") {
    throw new TourApiError(`TourAPI 오류: ${header.resultMsg}`, header.resultCode);
  }

  if (body.items === "") {
    return { item: [], totalCount: 0 };
  }
  return { item: body.items.item, totalCount: body.totalCount };
}
