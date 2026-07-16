import { tourApiFetch } from "./client";
import type {
  DetailCommonItem,
  DetailImageItem,
  DetailIntroItem,
  PlaceDetail,
  SearchKeywordItem,
} from "./types";

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  "12": "관광지",
  "14": "문화시설",
  "15": "축제공연행사",
  "25": "여행코스",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식점",
};

const INTRO_FIELD_LABELS: Record<string, string> = {
  usetime: "운영시간",
  usefee: "입장료",
  restdate: "휴무일",
  parking: "주차",
  infocenter: "문의처",
  opendate: "개장일",
  useseason: "이용시기",
  expguide: "체험안내",
  expagerange: "체험가능연령",
  accomcount: "수용인원",
  chkbabycarriage: "유모차 대여",
  chkpet: "반려동물 동반",
  chkcreditcard: "신용카드 사용",
};

export function formatIntroDetails(
  intro: DetailIntroItem | null,
): { label: string; value: string }[] {
  if (!intro) return [];
  return Object.entries(INTRO_FIELD_LABELS)
    .filter(([field]) => Boolean(intro[field]?.trim()))
    .map(([field, label]) => ({ label, value: intro[field] }));
}

function extractHomepageUrl(raw: string): string {
  const hrefMatch = raw.match(/href="([^"]+)"/);
  if (hrefMatch) return hrefMatch[1];
  return raw.replace(/<[^>]*>/g, "").trim();
}

export async function searchKeyword(keyword: string): Promise<SearchKeywordItem[]> {
  const { item } = await tourApiFetch<SearchKeywordItem>("searchKeyword2", {
    keyword,
  });
  return item;
}

export async function getDetailCommon(contentId: string): Promise<DetailCommonItem | null> {
  const { item } = await tourApiFetch<DetailCommonItem>("detailCommon2", {
    contentId,
    numOfRows: "1",
  });
  return item[0] ?? null;
}

export async function getDetailIntro(
  contentId: string,
  contentTypeId: string,
): Promise<DetailIntroItem | null> {
  const { item } = await tourApiFetch<DetailIntroItem>("detailIntro2", {
    contentId,
    contentTypeId,
    numOfRows: "1",
  });
  return item[0] ?? null;
}

export async function getDetailImages(contentId: string): Promise<DetailImageItem[]> {
  const { item } = await tourApiFetch<DetailImageItem>("detailImage2", {
    contentId,
    imageYN: "Y",
    numOfRows: "20",
  });
  return item;
}

export async function getPlaceDetail(contentId: string): Promise<PlaceDetail | null> {
  const common = await getDetailCommon(contentId);
  if (!common) return null;

  const [intro, images] = await Promise.all([
    getDetailIntro(contentId, common.contenttypeid),
    getDetailImages(contentId),
  ]);

  const gallery = images.map((image) => image.originimgurl).filter(Boolean);
  const allImages = [common.firstimage, ...gallery].filter(
    (url, index, all) => Boolean(url) && all.indexOf(url) === index,
  );

  return {
    contentId: common.contentid,
    contentTypeId: common.contenttypeid,
    title: common.title,
    category: CONTENT_TYPE_LABELS[common.contenttypeid] ?? "기타",
    address: [common.addr1, common.addr2].filter(Boolean).join(" "),
    latitude: Number(common.mapy),
    longitude: Number(common.mapx),
    description: common.overview,
    homepage: common.homepage ? extractHomepageUrl(common.homepage) : "",
    images: allImages,
    introDetails: formatIntroDetails(intro),
  };
}
