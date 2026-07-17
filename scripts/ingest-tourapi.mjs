// TourAPI(한국관광공사) 관광지 목록 + 대표이미지를 가져와 CLIP 임베딩을 추출하고
// Supabase의 places / place_images / place_embeddings에 채워넣는 1회성 데이터 적재 스크립트.
//
// 사용법:
//   node scripts/ingest-tourapi.mjs [--area 1|all] [--contentTypeId 12] [--limit all]
//   node scripts/ingest-tourapi.mjs --keyword "광안대교"
//
//   --area          TourAPI areaCode, 또는 "all"로 전국 17개 시/도를 순회 (기본값 all)
//   --contentTypeId TourAPI contentTypeId (기본값 12 = 관광지)
//   --limit         지역별로 가져올 개수. 기본값 "all" — 페이지를 끝까지 순회해서
//                   그 지역의 관광지를 전부 가져온다. 숫자를 주면 그 개수에서 멈춘다.
//   --keyword       지역 목록 대신 특정 장소명으로 검색해서 추가 (전국 순회로도
//                   놓친 유명 장소를 개별적으로 보충할 때 사용)
//
// 주의: 여기서 추출하는 임베딩은 반드시 src/lib/embedding/clip.ts와 동일한 모델
// (기본값 Xenova/clip-vit-base-patch32)을 써야 한다. 모델을 바꾸면 기존에 쌓인
// place_embeddings와 코사인 유사도 비교가 더 이상 의미를 갖지 않으므로 전부 재적재해야 한다.
//
// 장소당 firstimage 1장만으로는 사용자가 다른 각도/구도로 찍은 사진과 코사인
// 유사도가 잘 나오지 않아, KorService2 detailImage2(장소별 추가 이미지)로
// 같은 장소의 여러 각도 사진을 가져와 장소당 최대 MAX_IMAGES_PER_PLACE장까지 채운다.
// (관광사진갤러리 PhotoGalleryService1은 별도 활용신청이 필요한 API라 이 서비스키로는
// 403이 나서 쓸 수 없었다 — 같은 KorService2 상품인 detailImage2로 대체.)
// 재실행해도 안전하도록, 이미 그 개수만큼 채워진 장소는 건너뛴다(중복 적재 방지).

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { pipeline, RawImage } from "@huggingface/transformers";

const CLIP_MODEL = process.env.CLIP_MODEL || "Xenova/clip-vit-base-patch32";

const CONTENT_TYPE_LABELS = {
  12: "관광지",
  14: "문화시설",
  15: "축제공연행사",
  25: "여행코스",
  28: "레포츠",
  32: "숙박",
  38: "쇼핑",
  39: "음식점",
};

// TourAPI 표준 지역 코드 (전국 17개 시/도)
const ALL_AREA_CODES = [
  { code: "1", name: "서울" },
  { code: "2", name: "인천" },
  { code: "3", name: "대전" },
  { code: "4", name: "대구" },
  { code: "5", name: "광주" },
  { code: "6", name: "부산" },
  { code: "7", name: "울산" },
  { code: "8", name: "세종" },
  { code: "31", name: "경기" },
  { code: "32", name: "강원" },
  { code: "33", name: "충북" },
  { code: "34", name: "충남" },
  { code: "35", name: "경북" },
  { code: "36", name: "경남" },
  { code: "37", name: "전북" },
  { code: "38", name: "전남" },
  { code: "39", name: "제주" },
];

function loadEnv() {
  const env = { ...process.env };
  try {
    const text = fs.readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!(key in env)) env[key] = value;
    }
  } catch {
    // .env.local 없으면 process.env만 사용
  }
  return env;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { area: "all", contentTypeId: "12", limit: "all", keyword: null };
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    if (key === "area") opts.area = value;
    if (key === "contentTypeId") opts.contentTypeId = value;
    if (key === "limit") opts.limit = value === "all" ? "all" : Number(value);
    if (key === "keyword") opts.keyword = value;
  }
  return opts;
}

const PAGE_SIZE = 100;

async function fetchAreaBasedListPage(env, { area, contentTypeId, pageNo }) {
  const params = new URLSearchParams({
    serviceKey: env.TOUR_API_KEY,
    MobileOS: "ETC",
    MobileApp: "WhereIsIt",
    _type: "json",
    numOfRows: String(PAGE_SIZE),
    pageNo: String(pageNo),
    arrange: "Q",
    contentTypeId: String(contentTypeId),
    areaCode: String(area),
  });
  const url = `https://apis.data.go.kr/B551011/KorService2/areaBasedList2?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TourAPI 요청 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const header = data.response?.header;
  if (header?.resultCode !== "0000") {
    throw new Error(`TourAPI 오류: ${header?.resultCode} ${header?.resultMsg}`);
  }
  const items = data.response.body.items;
  if (!items || items === "") return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

// limit이 "all"이면 마지막 페이지(반환 건수 < PAGE_SIZE)까지 전부 순회한다.
async function fetchAreaBasedList(env, { area, contentTypeId, limit }) {
  const collected = [];
  let pageNo = 1;
  while (true) {
    const page = await fetchAreaBasedListPage(env, { area, contentTypeId, pageNo });
    collected.push(...page);
    if (limit !== "all" && collected.length >= limit) {
      return collected.slice(0, limit);
    }
    if (page.length < PAGE_SIZE) {
      return collected;
    }
    pageNo++;
  }
}

async function fetchByKeyword(env, { keyword, limit }) {
  const params = new URLSearchParams({
    serviceKey: env.TOUR_API_KEY,
    MobileOS: "ETC",
    MobileApp: "WhereIsIt",
    _type: "json",
    numOfRows: String(limit),
    pageNo: "1",
    keyword,
  });
  const url = `https://apis.data.go.kr/B551011/KorService2/searchKeyword2?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TourAPI 요청 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const header = data.response?.header;
  if (header?.resultCode !== "0000") {
    throw new Error(`TourAPI 오류: ${header?.resultCode} ${header?.resultMsg}`);
  }
  const items = data.response.body.items;
  if (!items || items === "") return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

let extractorPromise;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("image-feature-extraction", CLIP_MODEL);
  }
  return extractorPromise;
}

async function embedImageUrl(url) {
  const extractor = await getExtractor();
  const image = await RawImage.fromURL(url);
  const output = await extractor(image);
  return Array.from(output.data);
}

// 장소 하나당 여러 각도/구도의 참고 이미지를 쌓아야 실제 사용자가 다른 각도로
// 찍은 사진과도 코사인 유사도가 높게 나온다 (기존엔 firstimage 1장뿐이라
// 조금만 각도/구도가 달라도 유사도가 크게 떨어졌음). detailImage2가 보통
// 6장 이상을 반환하므로 그 안에서 최대 MAX_IMAGES_PER_PLACE장까지 채운다.
const MAX_IMAGES_PER_PLACE = 6;

async function fetchDetailImages(env, contentId) {
  const params = new URLSearchParams({
    serviceKey: env.TOUR_API_KEY,
    MobileOS: "ETC",
    MobileApp: "WhereIsIt",
    _type: "json",
    contentId: String(contentId),
    imageYN: "Y",
  });
  const url = `https://apis.data.go.kr/B551011/KorService2/detailImage2?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const header = data.response?.header;
  if (header?.resultCode !== "0000") return [];
  const items = data.response.body.items;
  if (!items || items === "") return [];
  const list = Array.isArray(items.item) ? items.item : [items.item];
  return list.map((i) => i.originimgurl).filter(Boolean);
}

async function collectImageUrls(env, item) {
  const urls = [];
  const firstImage = item.firstimage || item.firstimage2;
  if (firstImage) urls.push(firstImage);

  try {
    const detailUrls = await fetchDetailImages(env, item.contentid);
    for (const url of detailUrls) {
      if (!urls.includes(url)) urls.push(url);
      if (urls.length >= MAX_IMAGES_PER_PLACE) break;
    }
  } catch {
    // 추가 이미지 조회 실패해도 firstimage만으로 계속 진행
  }

  return urls.slice(0, MAX_IMAGES_PER_PLACE);
}

async function ingestItems(supabase, env, items, totals) {
  for (const item of items) {
    const candidateUrls = await collectImageUrls(env, item);
    if (candidateUrls.length === 0) {
      totals.skippedNoImage++;
      continue;
    }

    const { data: place, error: placeError } = await supabase
      .from("places")
      .upsert(
        {
          tour_content_id: item.contentid,
          name: item.title,
          category: CONTENT_TYPE_LABELS[item.contenttypeid] ?? "관광지",
          address: item.addr1 || item.addr2 || "주소 정보 없음",
          latitude: item.mapy ? Number(item.mapy) : null,
          longitude: item.mapx ? Number(item.mapx) : null,
        },
        { onConflict: "tour_content_id" }
      )
      .select("id")
      .single();

    if (placeError || !place) {
      console.error(`  [실패] ${item.title}: 관광지 저장 실패 - ${placeError?.message}`);
      totals.failed++;
      continue;
    }

    const { data: existingImages } = await supabase
      .from("place_images")
      .select("image_url")
      .eq("place_id", place.id);
    const existingUrls = new Set((existingImages ?? []).map((i) => i.image_url));

    const newUrls = candidateUrls.filter((url) => !existingUrls.has(url));
    const remainingSlots = MAX_IMAGES_PER_PLACE - existingUrls.size;
    if (remainingSlots <= 0 || newUrls.length === 0) {
      totals.skippedAlready++;
      continue;
    }

    let addedForThisPlace = 0;
    for (const imageUrl of newUrls.slice(0, remainingSlots)) {
      const { data: placeImage, error: imageError } = await supabase
        .from("place_images")
        .insert({ place_id: place.id, image_url: imageUrl })
        .select("id")
        .single();

      if (imageError || !placeImage) {
        console.error(`  [실패] ${item.title}: 이미지 저장 실패 - ${imageError?.message}`);
        totals.failed++;
        continue;
      }

      try {
        const embedding = await embedImageUrl(imageUrl);
        const { error: embeddingError } = await supabase
          .from("place_embeddings")
          .insert({
            place_id: place.id,
            place_image_id: placeImage.id,
            embedding,
          });
        if (embeddingError) throw new Error(embeddingError.message);
        addedForThisPlace++;
      } catch (err) {
        // 임베딩 실패 시 방금 넣은 place_images row를 남겨두면 다음 재실행에서
        // "이미 있는 이미지"로 취급돼 영원히 재시도가 안 막힌다 — 롤백해서 슬롯을 비워둔다.
        await supabase.from("place_images").delete().eq("id", placeImage.id);
        console.error(`  [실패] ${item.title}: 임베딩 추출/저장 실패 - ${err.message}`);
        totals.failed++;
      }
    }

    if (addedForThisPlace > 0) {
      totals.ingested += addedForThisPlace;
      console.log(`  [완료] ${item.title}: 이미지 ${addedForThisPlace}장 추가`);
    }
  }
}

async function main() {
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }
  if (!env.TOUR_API_KEY) {
    throw new Error("TOUR_API_KEY가 필요합니다.");
  }

  const opts = parseArgs();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const totals = { ingested: 0, skippedNoImage: 0, skippedAlready: 0, failed: 0 };

  if (opts.keyword) {
    console.log(`=== 키워드 검색: "${opts.keyword}" ===`);
    const items = await fetchByKeyword(env, { keyword: opts.keyword, limit: 20 });
    console.log(`${items.length}건 조회됨`);
    await ingestItems(supabase, env, items, totals);
  } else {
    const areas =
      opts.area === "all"
        ? ALL_AREA_CODES
        : [{ code: opts.area, name: `areaCode ${opts.area}` }];

    for (const area of areas) {
      console.log(
        `\n=== ${area.name} 조회 중... (contentTypeId=${opts.contentTypeId}, limit=${opts.limit}) ===`
      );
      const items = await fetchAreaBasedList(env, { ...opts, area: area.code });
      console.log(`${items.length}건 조회됨`);
      await ingestItems(supabase, env, items, totals);
    }
  }

  console.log(
    `\n적재 완료: 성공 ${totals.ingested}건 / 이미지 없음 ${totals.skippedNoImage}건 / 이미 존재 ${totals.skippedAlready}건 / 실패 ${totals.failed}건`
  );
}

main().catch((err) => {
  console.error("적재 스크립트 실패:", err);
  process.exit(1);
});
