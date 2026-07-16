import { callGalleryApi, normalizeItems } from "./client";
import type { GalleryItem, GalleryListResult, GallerySyncItem, TourApiBody } from "./types";

/** 정렬 구분 : A=촬영일, B=제목, C=수정일 */
export type GalleryArrange = "A" | "B" | "C";

function toListResult<T>(body: TourApiBody<T>): GalleryListResult<T> {
  return {
    items: normalizeItems(body.items),
    numOfRows: body.numOfRows,
    pageNo: body.pageNo,
    totalCount: body.totalCount,
  };
}

export interface GalleryListParams {
  [key: string]: string | number | undefined;
  numOfRows?: number;
  pageNo?: number;
  arrange?: GalleryArrange;
}

/** 관광사진갤러리 목록 조회 (제목 기준으로 그룹화된 목록) */
export async function getGalleryList(params: GalleryListParams = {}): Promise<GalleryListResult> {
  const body = await callGalleryApi<GalleryItem>("galleryList1", params);
  return toListResult(body);
}

export interface GalleryDetailListParams {
  [key: string]: string | number | undefined;
  /** 그룹화된 목록의 제목 (한글인 경우 URL 인코딩 필요) */
  title: string;
  numOfRows?: number;
  pageNo?: number;
}

/** 관광사진갤러리 상세 목록 조회 (특정 제목에 속한 사진들) */
export async function getGalleryDetailList(
  params: GalleryDetailListParams,
): Promise<GalleryListResult> {
  const body = await callGalleryApi<GalleryItem>("galleryDetailList1", params);
  return toListResult(body);
}

export interface GallerySearchParams {
  [key: string]: string | number | undefined;
  /** 검색 키워드 (한글인 경우 URL 인코딩 필요) */
  keyword: string;
  numOfRows?: number;
  pageNo?: number;
  arrange?: GalleryArrange;
}

/** 관광사진갤러리 키워드 검색 목록 조회 */
export async function searchGalleryByKeyword(
  params: GallerySearchParams,
): Promise<GalleryListResult> {
  const body = await callGalleryApi<GalleryItem>("gallerySearchList1", params);
  return toListResult(body);
}

export interface GallerySyncListParams {
  [key: string]: string | number | undefined;
  numOfRows?: number;
  pageNo?: number;
  /** 컨텐츠 표출여부 : 1=표출, 0=비표출 */
  showflag?: "0" | "1";
  /** 컨텐츠 변경일자 (YYYY, YYYYMM, YYYYMMDD 중 하나) */
  modifiedtime?: string;
  title?: string;
}

/** 관광사진갤러리 동기화 목록 조회 (변경분만 반영할 때 사용) */
export async function getGallerySyncDetailList(
  params: GallerySyncListParams = {},
): Promise<GalleryListResult<GallerySyncItem>> {
  const body = await callGalleryApi<GallerySyncItem>("gallerySyncDetailList1", params);
  return toListResult(body);
}
