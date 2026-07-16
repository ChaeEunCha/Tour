import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourApiError, tourApiFetch } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubEnv("TOUR_API_KEY", "test-key");
});

describe("tourApiFetch", () => {
  it("returns parsed items on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            header: { resultCode: "0000", resultMsg: "OK" },
            body: {
              items: { item: [{ contentid: "1" }] },
              numOfRows: 1,
              pageNo: 1,
              totalCount: 1,
            },
          },
        }),
      }),
    );

    const result = await tourApiFetch("detailCommon2", { contentId: "1" });
    expect(result.item).toEqual([{ contentid: "1" }]);
    expect(result.totalCount).toBe(1);
  });

  it("returns an empty array when items is an empty string (no match)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            header: { resultCode: "0000", resultMsg: "OK" },
            body: { items: "", numOfRows: 0, pageNo: 1, totalCount: 0 },
          },
        }),
      }),
    );

    const result = await tourApiFetch("detailCommon2", { contentId: "999" });
    expect(result.item).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("throws TourApiError on the flat-shape error response TourAPI returns for bad params", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          responseTime: "2026-01-01",
          resultCode: "10",
          resultMsg: "INVALID_REQUEST_PARAMETER_ERROR(contentTypeId)",
        }),
      }),
    );

    await expect(tourApiFetch("detailCommon2", {})).rejects.toThrow(TourApiError);
  });

  it("throws TourApiError when TOUR_API_KEY is missing", async () => {
    vi.stubEnv("TOUR_API_KEY", "");
    await expect(tourApiFetch("detailCommon2", {})).rejects.toThrow("TOUR_API_KEY");
  });
});
