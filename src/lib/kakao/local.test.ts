import { afterEach, describe, expect, it, vi } from "vitest";
import { KakaoApiError, searchNearby } from "./local";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockDocument(overrides: Partial<Record<string, string>> = {}) {
  return {
    id: "1",
    place_name: "테스트 장소",
    category_name: "음식점 > 한식",
    category_group_code: "FD6",
    distance: "120",
    address_name: "경북 포항시 남구",
    road_address_name: "경북 포항시 남구 호미로",
    phone: "054-000-0000",
    place_url: "http://place.map.kakao.com/1",
    x: "129.556",
    y: "35.989",
    ...overrides,
  };
}

describe("searchNearby", () => {
  it("groups FD6+CE7 as food and AT4 as play, each sorted by distance", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const code = new URL(url).searchParams.get("category_group_code");
      if (code === "FD6") {
        return {
          ok: true,
          json: async () => ({
            documents: [mockDocument({ distance: "300", place_name: "먼 식당" })],
            meta: { total_count: 1, is_end: true },
          }),
        };
      }
      if (code === "CE7") {
        return {
          ok: true,
          json: async () => ({
            documents: [
              mockDocument({
                distance: "100",
                place_name: "가까운 카페",
                category_group_code: "CE7",
              }),
            ],
            meta: { total_count: 1, is_end: true },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          documents: [
            mockDocument({ distance: "50", place_name: "명소", category_group_code: "AT4" }),
          ],
          meta: { total_count: 1, is_end: true },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchNearby(129.556, 35.989, 1000);

    expect(result.food.map((p) => p.placeName)).toEqual(["가까운 카페", "먼 식당"]);
    expect(result.play.map((p) => p.placeName)).toEqual(["명소"]);
  });

  it("throws KakaoApiError with the API's message when OPEN_MAP_AND_LOCAL is disabled for the app", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({
          errorType: "NotAuthorizedError",
          message: "App(whereisit) disabled OPEN_MAP_AND_LOCAL service.",
        }),
      }),
    );

    await expect(searchNearby(129.556, 35.989)).rejects.toThrow(
      "App(whereisit) disabled OPEN_MAP_AND_LOCAL service.",
    );
  });

  it("throws KakaoApiError when KAKAO_REST_API_KEY is missing", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "");
    await expect(searchNearby(129.556, 35.989)).rejects.toThrow(KakaoApiError);
  });
});
