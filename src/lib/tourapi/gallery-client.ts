import type { TourApiBody, TourApiResponse } from "./gallery-types";

const BASE_URL = "https://apis.data.go.kr/B551011/PhotoGalleryService1";
const SUCCESS_CODE = "00";

export class TourApiError extends Error {
  constructor(
    public readonly resultCode: string,
    message: string,
  ) {
    super(message);
    this.name = "TourApiError";
  }
}

type GalleryOperation =
  | "galleryList1"
  | "galleryDetailList1"
  | "gallerySyncDetailList1"
  | "gallerySearchList1";

function getServiceKey(): string {
  const key = process.env.TOUR_API_KEY;
  if (!key) {
    throw new Error("TOUR_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  return key;
}

export async function callGalleryApi<T>(
  operation: GalleryOperation,
  params: Record<string, string | number | undefined>,
): Promise<TourApiBody<T>> {
  const searchParams = new URLSearchParams({
    serviceKey: getServiceKey(),
    MobileOS: "ETC",
    MobileApp: "WhereIsIt",
    _type: "json",
  });

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }

  const res = await fetch(`${BASE_URL}/${operation}?${searchParams.toString()}`);

  if (!res.ok) {
    throw new TourApiError("HTTP_ERROR", `TourAPI 요청 실패: ${res.status} ${res.statusText}`);
  }

  const data: TourApiResponse<T> = await res.json();
  const { header, body } = data.response;

  if (header.resultCode !== SUCCESS_CODE) {
    throw new TourApiError(header.resultCode, header.resultMsg);
  }

  return body;
}

export function normalizeItems<T>(items: TourApiBody<T>["items"]): T[] {
  if (typeof items === "string" || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}
