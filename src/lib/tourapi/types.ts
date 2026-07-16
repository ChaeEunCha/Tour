export interface TourApiResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: "" | { item: T[] };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export interface TourApiFlatError {
  responseTime: string;
  resultCode: string;
  resultMsg: string;
}

export interface SearchKeywordItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2: string;
  firstimage: string;
  firstimage2: string;
  mapx: string;
  mapy: string;
  tel: string;
}

export interface DetailCommonItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  homepage: string;
  firstimage: string;
  firstimage2: string;
  addr1: string;
  addr2: string;
  zipcode: string;
  mapx: string;
  mapy: string;
  overview: string;
}

export interface DetailIntroItem {
  contentid: string;
  contenttypeid: string;
  [field: string]: string;
}

export interface DetailImageItem {
  contentid: string;
  originimgurl: string;
  imgname: string;
  smallimageurl: string;
}

export interface PlaceDetail {
  contentId: string;
  contentTypeId: string;
  title: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  homepage: string;
  images: string[];
  introDetails: { label: string; value: string }[];
}
