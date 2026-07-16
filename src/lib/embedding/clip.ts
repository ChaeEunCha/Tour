import { pipeline, RawImage } from "@huggingface/transformers";

// CLIP 이미지 임베딩 추출 (F-03/F-04 공통 매칭 엔진의 1단계).
//
// Hugging Face의 무료 서버리스 Inference API(예전 api-inference.huggingface.co)는
// 2025년 개편 이후 순수 CLIP 이미지 인코더를 더 이상 서빙하지 않는다
// ("Model not supported by provider hf-inference"). 대신 Transformers.js로
// 동일한 CLIP 모델을 서버(Route Handler) 안에서 직접 실행한다 — 외부 API 호출이
// 전혀 없어 완전 무료이고 요금 한도 걱정도 없다.
//
// 주의: place_embeddings에 저장되는 관광지 이미지 임베딩도 반드시 동일 모델
// (Xenova/clip-vit-base-patch32)로 추출해야 코사인 유사도가 의미를 가진다.
// 데이터 적재 파이프라인에서 모델을 바꾸지 않도록 주의할 것.
const DEFAULT_MODEL = "Xenova/clip-vit-base-patch32";

export class EmbeddingError extends Error {}

let extractorPromise: ReturnType<
  typeof pipeline<"image-feature-extraction">
> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    const model = process.env.CLIP_MODEL || DEFAULT_MODEL;
    extractorPromise = pipeline("image-feature-extraction", model);
  }
  return extractorPromise;
}

export async function getImageEmbedding(
  imageBytes: Buffer,
  contentType: string
): Promise<number[]> {
  try {
    const extractor = await getExtractor();
    const blob = new Blob([new Uint8Array(imageBytes)], { type: contentType });
    const image = await RawImage.fromBlob(blob);
    const output = await extractor(image);
    return Array.from(output.data as Float32Array);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    throw new EmbeddingError(`이미지 임베딩 추출 실패: ${message}`);
  }
}
