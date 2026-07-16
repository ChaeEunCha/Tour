export interface TourApiHeader {
  resultCode: string;
  resultMsg: string;
}

export interface TourApiItems<T> {
  item?: T | T[];
}

export interface TourApiBody<T> {
  items: TourApiItems<T> | "";
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

export interface TourApiResponse<T> {
  response: {
    header: TourApiHeader;
    body: TourApiBody<T>;
  };
}

/** 관광사진갤러리 목록/상세/검색 조회 공통 아이템 */
export interface GalleryItem {
  galContentId: string;
  galContentTypeId: string;
  galTitle: string;
  galWebImageUrl: string;
  galCreatedtime: string;
  galModifiedtime: string;
  galPhotographyMonth: string;
  galPhotographyLocation: string;
  galPhotographer: string;
  galSearchKeyword: string;
}

/** 동기화 목록 조회 전용 아이템 (표출여부 필드 추가) */
export interface GallerySyncItem extends GalleryItem {
  galUseFlag: string;
}

export interface GalleryListResult<T = GalleryItem> {
  items: T[];
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}
