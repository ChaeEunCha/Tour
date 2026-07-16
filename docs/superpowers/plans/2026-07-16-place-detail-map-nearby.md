# F-05/F-06/F-07 (관광지 상세정보 · 지도 · 주변 먹거리·놀거리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement F-05 (관광지 상세정보), F-06 (지도로 보기), F-07 (주변 먹거리·놀거리) end-to-end for a single worked example place, without waiting on the F-03/F-04 CLIP matching engine.

**Architecture:** Server-side library wrappers call 한국관광공사 TourAPI (`KorService2`) for place detail and 카카오 로컬 REST API for nearby food/play search, keeping both secret keys (`TOUR_API_KEY`, `KAKAO_REST_API_KEY`) server-only. Two Next.js Route Handlers expose this data as JSON. A Server Component page (`/places/[id]`) calls the library functions directly (no self-fetch) and renders three presentational pieces: a detail card (F-05), a Kakao Maps JS SDK map with colored markers (F-06, client component using the public `NEXT_PUBLIC_KAKAO_MAP_KEY`), and a tabbed nearby list (F-07). The route's `[id]` is the TourAPI `contentId` directly (PRD F-05 explicitly allows `place_id` 또는 `tour_content_id`), so this works today without a seeded Supabase `places` table.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers, async `params`), TypeScript strict mode, Tailwind CSS v4 (`@theme inline` tokens), Vitest 4 for unit tests (mocked `fetch`), Kakao Maps JS SDK (script-injected client-side).

## Global Constraints

- No paid APIs — TourAPI, Kakao Map/Local, Hugging Face all free tier (PRD §4, §9).
- `TOUR_API_KEY` and `KAKAO_REST_API_KEY` must only be read in server-side code (Route Handlers / server-only lib files) — never exposed to the client bundle. Only `NEXT_PUBLIC_KAKAO_MAP_KEY` is client-safe.
- "결과 없음" 상태를 만들지 않는다 (PRD §7) applies to F-03/F-04 matching, not to F-05/06/07 — but nearby search failures (e.g. Kakao API outage) must degrade to an empty list with a message, never crash the page (PRD §9 성능/안정성 취지).
- Design tokens/colors/type scale/shape rules must match `DESIGN_SYSTEM.md` exactly — no new colors invented. Map marker colors reuse the existing palette: 관광지 = `accent` (`#1E8A82`), 음식점·카페 = `primary` (`#F2704F`), 놀거리 = 정확도 배지 성공색 (`#2E9E5B`) (DESIGN_SYSTEM.md §1).
- Body/UI 폰트는 시스템 폰트 스택만 사용, 외부 웹폰트 로드 금지 (DESIGN_SYSTEM.md §2).
- Next.js 16 Route Handler and Page `params` are `Promise`-typed and must be `await`ed — do not destructure synchronously.
- `tsconfig.json` path alias `@/*` → `./src/*` — use it for all internal imports.

## External API status (verified live during planning)

- `TOUR_API_KEY` works (`searchKeyword2`, `detailCommon2`, `detailIntro2`, `detailImage2` all returned real data for 구룡포항, `contentId=2610501`, `contentTypeId=12`).
- `KAKAO_REST_API_KEY` / `NEXT_PUBLIC_KAKAO_MAP_KEY`: the user regenerated both keys and enabled the "카카오맵" (OPEN_MAP_AND_LOCAL) product in the Kakao Developers console, plus registered `http://localhost:3000` as a Web platform domain. Re-tested `category.json` after this change — now returns real nearby results (e.g. 159 restaurants within 1000m of 구룡포항). The keys currently in `.env.local` are confirmed working; the tasks below will read them via `process.env` as normal, no further workaround needed.

---

### Task 1: Design tokens & external image config

**Files:**
- Modify: `src/app/globals.css`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: Tailwind utility classes `bg-bg`, `bg-bg-raised`, `text-text`, `text-text-muted`, `border-border`, `bg-primary`, `text-primary`, `bg-primary-hover`, `bg-accent`, `text-accent`, `bg-accent-soft` — consumed by every component task below (8, 9, 10, 11).
- Produces: `next.config.ts` `images.remotePatterns` allowing `tong.visitkorea.or.kr` — consumed by Task 8 (`next/image` for TourAPI photos).

- [ ] **Step 1: Add DESIGN_SYSTEM.md color tokens to `globals.css`**

Replace the full contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  --color-bg: #FFFBF8;
  --color-bg-raised: #FFF4EC;
  --color-text: #2B2320;
  --color-text-muted: #6B5A4E;
  --color-border: #ECDFD3;
  --color-primary: #F2704F;
  --color-primary-hover: #DC5C3B;
  --color-accent: #1E8A82;
  --color-accent-soft: #E4F3F1;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
    "Malgun Gothic", "Noto Sans KR", sans-serif;
}
```

Note: the previous `@media (prefers-color-scheme: dark)` block is removed — it only toggled `--background`/`--foreground`, which `body` no longer reads now that it uses `--color-bg`/`--color-text` directly, and DESIGN_SYSTEM.md defines a single light "코럴 트래블" theme with no dark variant.

- [ ] **Step 2: Allow TourAPI's image host in `next.config.ts`**

Replace the full contents of `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css next.config.ts
git commit -m "feat: add design system color tokens and TourAPI image host config"
```

---

### Task 2: TourAPI client core (types + fetch wrapper) + Vitest setup

**Files:**
- Create: `src/lib/tourapi/types.ts`
- Create: `src/lib/tourapi/client.ts`
- Create: `src/lib/tourapi/client.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `TourApiResponse<T>`, `SearchKeywordItem`, `DetailCommonItem`, `DetailIntroItem`, `DetailImageItem`, `PlaceDetail` (types) — consumed by Task 3.
- Produces: `tourApiFetch<T>(endpoint: string, params: Record<string, string>): Promise<{ item: T[]; totalCount: number }>` and `class TourApiError extends Error` — consumed by Task 3.

- [ ] **Step 1: Add Vitest**

Run: `npm install --save-dev vitest@^4.1.10`
Expected: `vitest` added to `package.json` `devDependencies`.

- [ ] **Step 2: Add test script to `package.json`**

In `package.json`, add under `"scripts"`:

```json
"test": "vitest run"
```

Full `scripts` block becomes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Create `src/lib/tourapi/types.ts`**

```ts
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
```

- [ ] **Step 5: Write the failing test for the fetch wrapper**

Create `src/lib/tourapi/client.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the test to verify it fails (module doesn't exist yet)**

Run: `npx vitest run src/lib/tourapi/client.test.ts`
Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 7: Implement `src/lib/tourapi/client.ts`**

```ts
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
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/lib/tourapi/client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/tourapi/types.ts src/lib/tourapi/client.ts src/lib/tourapi/client.test.ts
git commit -m "feat: add TourAPI fetch wrapper with Vitest coverage"
```

---

### Task 3: TourAPI place detail functions

**Files:**
- Create: `src/lib/tourapi/places.ts`
- Create: `src/lib/tourapi/places.test.ts`

**Interfaces:**
- Consumes: `tourApiFetch`, `TourApiError` from `./client` (Task 2); `SearchKeywordItem`, `DetailCommonItem`, `DetailIntroItem`, `DetailImageItem`, `PlaceDetail` from `./types` (Task 2).
- Produces: `searchKeyword(keyword: string): Promise<SearchKeywordItem[]>`, `getDetailCommon(contentId: string): Promise<DetailCommonItem | null>`, `getDetailIntro(contentId: string, contentTypeId: string): Promise<DetailIntroItem | null>`, `getDetailImages(contentId: string): Promise<DetailImageItem[]>`, `getPlaceDetail(contentId: string): Promise<PlaceDetail | null>`, `formatIntroDetails(intro: DetailIntroItem | null): { label: string; value: string }[]`, `CONTENT_TYPE_LABELS: Record<string, string>` — consumed by Task 5 (route), Task 6 (route), Task 11 (page).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tourapi/places.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/tourapi/places.test.ts`
Expected: FAIL — `Cannot find module './places'`.

- [ ] **Step 3: Implement `src/lib/tourapi/places.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/tourapi/places.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tourapi/places.ts src/lib/tourapi/places.test.ts
git commit -m "feat: add TourAPI place detail lookup (F-05 data layer)"
```

---

### Task 4: Kakao Local nearby search

**Files:**
- Create: `src/lib/kakao/local.ts`
- Create: `src/lib/kakao/local.test.ts`

**Interfaces:**
- Produces: `interface KakaoPlace { id, placeName, categoryName, categoryGroupCode, distance, addressName, roadAddressName, phone, placeUrl, longitude, latitude }`, `interface NearbyPlaces { food: KakaoPlace[]; play: KakaoPlace[] }`, `searchNearby(x: number, y: number, radius?: number): Promise<NearbyPlaces>`, `class KakaoApiError extends Error` — consumed by Task 6 (route) and Task 11 (page).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/kakao/local.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/kakao/local.test.ts`
Expected: FAIL — `Cannot find module './local'`.

- [ ] **Step 3: Implement `src/lib/kakao/local.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/kakao/local.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kakao/local.ts src/lib/kakao/local.test.ts
git commit -m "feat: add Kakao Local nearby food/play search (F-07 data layer)"
```

---

### Task 5: Place detail API route

**Files:**
- Create: `src/app/api/places/[id]/route.ts`

**Interfaces:**
- Consumes: `getPlaceDetail` from `@/lib/tourapi/places` (Task 3).
- Produces: `GET /api/places/:id` → `200 PlaceDetail | 404 {error} | 502 {error}` — consumed by Task 11 manual verification (not consumed by the page component, which calls `getPlaceDetail` directly to avoid a self-fetch).

- [ ] **Step 1: Implement the route**

Create `src/app/api/places/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/tourapi/places";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const place = await getPlaceDetail(id);
    if (!place) {
      return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(place);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Manually verify against the live TourAPI**

Run: `npm run dev` (leave running in background)
Then: `curl -s http://localhost:3000/api/places/2610501`
Expected: JSON body with `"title":"구룡포항"`, `"category":"관광지"`, `"latitude":35.9893051205`, `"longitude":129.555641609...`, non-empty `images` array.

Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/places/000000000`
Expected: `404`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/places/\[id\]/route.ts
git commit -m "feat: add place detail API route (F-05)"
```

---

### Task 6: Nearby food/play API route

**Files:**
- Create: `src/app/api/places/[id]/nearby/route.ts`
- Delete: `src/app/api/places/[id]/nearby/.gitkeep`

**Interfaces:**
- Consumes: `getDetailCommon` from `@/lib/tourapi/places` (Task 3), `searchNearby` from `@/lib/kakao/local` (Task 4).
- Produces: `GET /api/places/:id/nearby?x&y&radius` → `200 NearbyPlaces | 404 {error} | 502 {error}` — consumed by Task 11 manual verification.

- [ ] **Step 1: Implement the route**

Create `src/app/api/places/[id]/nearby/route.ts`:

```ts
import { NextResponse } from "next/server";
import { searchNearby } from "@/lib/kakao/local";
import { getDetailCommon } from "@/lib/tourapi/places";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const radius = Number(searchParams.get("radius")) || 1000;

  try {
    let x = Number(searchParams.get("x"));
    let y = Number(searchParams.get("y"));

    if (!x || !y) {
      const common = await getDetailCommon(id);
      if (!common) {
        return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
      }
      x = Number(common.mapx);
      y = Number(common.mapy);
    }

    const nearby = await searchNearby(x, y, radius);
    return NextResponse.json(nearby);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Delete the placeholder**

Run: `rm src/app/api/places/[id]/nearby/.gitkeep`

- [ ] **Step 3: Manually verify against the live Kakao API**

Run (with `npm run dev` still running): `curl -s http://localhost:3000/api/places/2610501/nearby`

Expected: `200` with `{"food":[...],"play":[...]}` — non-empty arrays of nearby restaurants/cafes (`food`) and attractions (`play`) around 구룡포항, each sorted by ascending distance.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/places/\[id\]/nearby/route.ts
git rm src/app/api/places/\[id\]/nearby/.gitkeep
git commit -m "feat: add nearby food/play API route (F-07)"
```

---

### Task 7: Kakao Maps JS SDK loader + ambient types

**Files:**
- Create: `src/types/kakao-maps.d.ts`
- Create: `src/lib/kakao/loadKakaoMapsSdk.ts`

**Interfaces:**
- Produces: global `Window.kakao` typing (`kakao.maps.LatLng`, `Map`, `Marker`, `MarkerImage`, `Size`, `InfoWindow`, `event.addListener`, `load`) — consumed by Task 10 (`PlaceMap`).
- Produces: `loadKakaoMapsSdk(): Promise<typeof window.kakao>` — consumed by Task 10.

- [ ] **Step 1: Add ambient Kakao Maps types**

Create `src/types/kakao-maps.d.ts`:

```ts
export {};

declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class MarkerImage {
      constructor(src: string, size: Size);
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number });
    }

    class Marker {
      constructor(options: {
        map?: Map;
        position: LatLng;
        image?: MarkerImage;
        title?: string;
      });
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(options: { content: string });
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    namespace event {
      function addListener(target: Marker, type: string, handler: () => void): void;
    }

    function load(callback: () => void): void;
  }

  interface Window {
    kakao: typeof kakao;
  }
}
```

- [ ] **Step 2: Implement the SDK loader**

Create `src/lib/kakao/loadKakaoMapsSdk.ts`:

```ts
let loadPromise: Promise<typeof window.kakao> | null = null;

export function loadKakaoMapsSdk(): Promise<typeof window.kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("loadKakaoMapsSdk는 브라우저 환경에서만 호출할 수 있습니다."),
    );
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appKey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다."));
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (this file has no automated test — it touches `window`/`document` and is verified visually in Task 11).

- [ ] **Step 4: Commit**

```bash
git add src/types/kakao-maps.d.ts src/lib/kakao/loadKakaoMapsSdk.ts
git commit -m "feat: add Kakao Maps JS SDK loader and ambient types"
```

---

### Task 8: Place detail UI (F-05)

**Files:**
- Create: `src/components/places/PlaceDetailCard.tsx`
- Create: `src/components/places/PlaceGallery.tsx`

**Interfaces:**
- Consumes: `PlaceDetail` type from `@/lib/tourapi/types` (Task 2). Consumes Tailwind tokens from Task 1 (`bg-bg-raised`, `text-text`, `text-text-muted`, `border-border`, `bg-accent-soft`, `text-accent`).
- Produces: `PlaceDetailCard({ place: PlaceDetail })`, `PlaceGallery({ images: string[]; title: string })` — consumed by Task 11 (page).

- [ ] **Step 1: Implement `PlaceDetailCard`**

Create `src/components/places/PlaceDetailCard.tsx`:

```tsx
import Image from "next/image";
import type { PlaceDetail } from "@/lib/tourapi/types";

export function PlaceDetailCard({ place }: { place: PlaceDetail }) {
  return (
    <article className="flex flex-col gap-4 rounded-[12px] border border-border bg-bg-raised p-5">
      {place.images[0] && (
        <div className="relative h-56 w-full overflow-hidden rounded-[12px]">
          <Image
            src={place.images[0]}
            alt={place.title}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          {place.category}
        </span>
        <h1 className="text-xl font-semibold text-text">{place.title}</h1>
        <p className="text-sm text-text-muted">{place.address}</p>
      </div>
      {place.description && (
        <p className="text-sm leading-6 text-text">{place.description}</p>
      )}
      {place.introDetails.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {place.introDetails.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-text-muted">{detail.label}</dt>
              <dd className="text-text">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {place.homepage && (
        <a
          href={place.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent underline"
        >
          홈페이지 방문
        </a>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Implement `PlaceGallery`**

Create `src/components/places/PlaceGallery.tsx`:

```tsx
import Image from "next/image";

export function PlaceGallery({ images, title }: { images: string[]; title: string }) {
  if (images.length <= 1) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.slice(1, 7).map((url) => (
        <div key={url} className="relative aspect-square overflow-hidden rounded-[12px]">
          <Image src={url} alt={title} fill sizes="33vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/places/PlaceDetailCard.tsx src/components/places/PlaceGallery.tsx
git commit -m "feat: add place detail card and gallery components (F-05 UI)"
```

---

### Task 9: Nearby list UI (F-07)

**Files:**
- Create: `src/components/places/NearbyList.tsx`

**Interfaces:**
- Consumes: `KakaoPlace` type from `@/lib/kakao/local` (Task 4). Consumes Tailwind tokens from Task 1.
- Produces: `NearbyList({ food: KakaoPlace[]; play: KakaoPlace[] })` — consumed by Task 11 (page).

- [ ] **Step 1: Implement the tabbed list**

Create `src/components/places/NearbyList.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { KakaoPlace } from "@/lib/kakao/local";

type Tab = "food" | "play";

export function NearbyList({ food, play }: { food: KakaoPlace[]; play: KakaoPlace[] }) {
  const [tab, setTab] = useState<Tab>("food");
  const items = tab === "food" ? food : play;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex w-fit gap-1 rounded-full border border-border bg-bg-raised p-1">
        <button
          type="button"
          onClick={() => setTab("food")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "food" ? "bg-primary text-white" : "text-text-muted"
          }`}
        >
          먹거리 ({food.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("play")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "play" ? "bg-accent text-white" : "text-text-muted"
          }`}
        >
          놀거리 ({play.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">반경 내에 결과가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-[12px] border border-border bg-bg-raised px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text">{item.placeName}</span>
                <span className="text-xs text-text-muted">{item.categoryName}</span>
              </div>
              <span className="text-xs font-medium text-text-muted">
                {Math.round(item.distance)}m
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/places/NearbyList.tsx
git commit -m "feat: add tabbed nearby food/play list component (F-07 UI)"
```

---

### Task 10: Map UI (F-06)

**Files:**
- Create: `src/components/map/PlaceMap.tsx`

**Interfaces:**
- Consumes: `loadKakaoMapsSdk` from `@/lib/kakao/loadKakaoMapsSdk` (Task 7), `KakaoPlace` from `@/lib/kakao/local` (Task 4), the global `kakao.maps` types (Task 7).
- Produces: `PlaceMap({ place: { title: string; latitude: number; longitude: number }; food: KakaoPlace[]; play: KakaoPlace[] })` — consumed by Task 11 (page).

- [ ] **Step 1: Implement the map component**

Create `src/components/map/PlaceMap.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { loadKakaoMapsSdk } from "@/lib/kakao/loadKakaoMapsSdk";
import type { KakaoPlace } from "@/lib/kakao/local";

const MARKER_COLORS = {
  place: "#1E8A82",
  food: "#F2704F",
  play: "#2E9E5B",
} as const;

function createMarkerImage(kakaoSdk: typeof window.kakao, color: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
    `<path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24s16-13 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>` +
    `<circle cx="16" cy="16" r="6" fill="#fff"/></svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new kakaoSdk.maps.MarkerImage(src, new kakaoSdk.maps.Size(32, 40));
}

interface PlaceMapProps {
  place: { title: string; latitude: number; longitude: number };
  food: KakaoPlace[];
  play: KakaoPlace[];
}

export function PlaceMap({ place, food, play }: PlaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const markers: InstanceType<typeof window.kakao.maps.Marker>[] = [];

    loadKakaoMapsSdk().then((kakaoSdk) => {
      if (cancelled || !containerRef.current) return;

      const center = new kakaoSdk.maps.LatLng(place.latitude, place.longitude);
      const map = new kakaoSdk.maps.Map(containerRef.current, { center, level: 5 });

      const addMarker = (
        lat: number,
        lng: number,
        color: string,
        label: string,
        detail?: string,
      ) => {
        const position = new kakaoSdk.maps.LatLng(lat, lng);
        const marker = new kakaoSdk.maps.Marker({
          map,
          position,
          image: createMarkerImage(kakaoSdk, color),
          title: label,
        });
        const info = new kakaoSdk.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;">${label}${
            detail ? `<br/>${detail}` : ""
          }</div>`,
        });
        kakaoSdk.maps.event.addListener(marker, "click", () => info.open(map, marker));
        markers.push(marker);
      };

      addMarker(place.latitude, place.longitude, MARKER_COLORS.place, place.title);

      for (const item of food) {
        addMarker(
          item.latitude,
          item.longitude,
          MARKER_COLORS.food,
          item.placeName,
          `${Math.round(item.distance)}m · ${item.categoryName}`,
        );
      }

      for (const item of play) {
        addMarker(
          item.latitude,
          item.longitude,
          MARKER_COLORS.play,
          item.placeName,
          `${Math.round(item.distance)}m · ${item.categoryName}`,
        );
      }
    });

    return () => {
      cancelled = true;
      for (const marker of markers) marker.setMap(null);
    };
  }, [place, food, play]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="h-80 w-full rounded-[12px] border border-border" />
      <div className="flex gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.place }}
          />
          관광지
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.food }}
          />
          음식점·카페
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MARKER_COLORS.play }}
          />
          놀거리
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/PlaceMap.tsx
git commit -m "feat: add Kakao map with place/food/play markers (F-06 UI)"
```

---

### Task 11: Place detail page, home entry point, and end-to-end verification

**Files:**
- Create: `src/app/(main)/places/[id]/page.tsx`
- Delete: `src/app/(main)/places/[id]/.gitkeep`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `getPlaceDetail` (Task 3), `searchNearby` (Task 4), `PlaceDetailCard`/`PlaceGallery` (Task 8), `NearbyList` (Task 9), `PlaceMap` (Task 10).

- [ ] **Step 1: Implement the place detail page**

Create `src/app/(main)/places/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { PlaceMap } from "@/components/map/PlaceMap";
import { NearbyList } from "@/components/places/NearbyList";
import { PlaceDetailCard } from "@/components/places/PlaceDetailCard";
import { PlaceGallery } from "@/components/places/PlaceGallery";
import { searchNearby } from "@/lib/kakao/local";
import { getPlaceDetail } from "@/lib/tourapi/places";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const place = await getPlaceDetail(id);
  if (!place) {
    notFound();
  }

  const nearby = await searchNearby(place.longitude, place.latitude, 1000).catch(
    () => ({ food: [], play: [] }),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 bg-bg p-4 pb-16">
      <PlaceDetailCard place={place} />
      <PlaceGallery images={place.images} title={place.title} />
      <PlaceMap place={place} food={nearby.food} play={nearby.play} />
      <NearbyList food={nearby.food} play={nearby.play} />
    </main>
  );
}
```

- [ ] **Step 2: Remove the now-unneeded placeholder**

Run: `rm "src/app/(main)/places/[id]/.gitkeep"`

- [ ] **Step 3: Replace the starter home page with a demo entry point**

Replace the full contents of `src/app/page.tsx` with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text">어디있을까?</h1>
        <p className="text-sm text-text-muted">
          사진 한 장으로 여행 장소를 다시 찾아드려요.
        </p>
      </div>
      <Link
        href="/places/2610501"
        className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        예시 보기: 구룡포항 상세정보
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Update page metadata**

In `src/app/layout.tsx`, replace:

```tsx
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

with:

```tsx
export const metadata: Metadata = {
  title: "어디있을까?",
  description: "사진 한 장으로 여행 장소를 다시 찾아드리는 서비스",
};
```

- [ ] **Step 5: Full type-check, lint, and unit test pass**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all three succeed with zero errors and all Vitest suites passing (client.test.ts, places.test.ts, local.test.ts).

- [ ] **Step 6: Manual end-to-end browser verification**

Run: `npm run dev`, open `http://localhost:3000` in a browser.

- Click "예시 보기: 구룡포항 상세정보" → navigates to `/places/2610501`.
- **F-05:** confirm the hero image, "관광지" badge, title "구룡포항", address, overview paragraph, and "운영시간 상시 개방 / 휴무일 연중무휴" detail rows render.
- **F-06:** confirm a map renders centered on 구룡포항 with a teal marker at the place, plus coral markers for nearby food/cafes and green markers for nearby attractions. Clicking a marker opens an InfoWindow with its name/distance/category.
- **F-07:** confirm the 먹거리/놀거리 tab switcher renders non-empty lists with place name, category, and distance for each nearby result.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(main)/places/[id]/page.tsx" src/app/page.tsx src/app/layout.tsx
git rm "src/app/(main)/places/[id]/.gitkeep"
git commit -m "feat: wire up place detail page with map and nearby list (F-05/F-06/F-07)"
```
