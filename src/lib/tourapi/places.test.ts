import { afterEach, describe, expect, it, vi } from "vitest";
import { tourApiFetch } from "./client";
import { formatIntroDetails, getPlaceDetail } from "./places";
import type { DetailIntroItem } from "./types";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, tourApiFetch: vi.fn() };
});

const mockedFetch = vi.mocked(tourApiFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe("formatIntroDetails", () => {
  it("returns only non-empty known fields, in Korean labels", () => {
    const intro: DetailIntroItem = {
      contentid: "1",
      contenttypeid: "12",
      usetime: "상시 개방",
      restdate: "연중무휴",
      parking: "",
      infocenter: "",
    };
    expect(formatIntroDetails(intro)).toEqual([
      { label: "운영시간", value: "상시 개방" },
      { label: "휴무일", value: "연중무휴" },
    ]);
  });

  it("returns an empty array when intro is null", () => {
    expect(formatIntroDetails(null)).toEqual([]);
  });
});

describe("getPlaceDetail", () => {
  it("combines detailCommon2, detailIntro2, detailImage2 into a normalized PlaceDetail", async () => {
    mockedFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === "detailCommon2") {
        return {
          totalCount: 1,
          item: [
            {
              contentid: "2610501",
              contenttypeid: "12",
              title: "구룡포항",
              homepage:
                '<a href="http://phtour.pohang.go.kr" target="_blank">http://phtour.pohang.go.kr</a>',
              firstimage: "http://tong.visitkorea.or.kr/a.jpg",
              firstimage2: "",
              addr1: "경상북도 포항시 남구 구룡포읍 호미로 222-1",
              addr2: "",
              zipcode: "37933",
              mapx: "129.5556416090",
              mapy: "35.9893051205",
              overview: "포항 구룡포항 설명",
            },
          ],
        };
      }
      if (endpoint === "detailIntro2") {
        return {
          totalCount: 1,
          item: [
            {
              contentid: "2610501",
              contenttypeid: "12",
              usetime: "상시 개방",
              restdate: "연중무휴",
            },
          ],
        };
      }
      if (endpoint === "detailImage2") {
        return {
          totalCount: 1,
          item: [
            {
              contentid: "2610501",
              originimgurl: "http://tong.visitkorea.or.kr/b.jpg",
              imgname: "",
              smallimageurl: "",
            },
          ],
        };
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    const detail = await getPlaceDetail("2610501");

    expect(detail).toEqual({
      contentId: "2610501",
      contentTypeId: "12",
      title: "구룡포항",
      category: "관광지",
      address: "경상북도 포항시 남구 구룡포읍 호미로 222-1",
      latitude: 35.9893051205,
      longitude: 129.555641609,
      description: "포항 구룡포항 설명",
      homepage: "http://phtour.pohang.go.kr",
      images: [
        "http://tong.visitkorea.or.kr/a.jpg",
        "http://tong.visitkorea.or.kr/b.jpg",
      ],
      introDetails: [
        { label: "운영시간", value: "상시 개방" },
        { label: "휴무일", value: "연중무휴" },
      ],
    });
  });

  it("returns null when detailCommon2 has no matching content", async () => {
    mockedFetch.mockResolvedValue({ totalCount: 0, item: [] });
    const detail = await getPlaceDetail("0");
    expect(detail).toBeNull();
  });
});
