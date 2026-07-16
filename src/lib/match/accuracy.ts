// 기획서 7장 "이미지 매칭 정확도 표시 정책" 구현.
// 검색 결과는 항상 반환하며, "일치하는 곳이 없습니다" 같은 실패 상태는 두지 않는다.

export type AccuracyBand = "exact" | "likely" | "similar" | "low";

export interface AccuracyInfo {
  percent: number;
  band: AccuracyBand;
  message: string;
}

// 변환식(초기안): (cosine유사도 - 0.5) / (1.0 - 0.5) * 100, 0~100 범위로 clamp.
export function cosineToAccuracyPercent(cosineSimilarity: number): number {
  const raw = ((cosineSimilarity - 0.5) / 0.5) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getAccuracyInfo(cosineSimilarity: number): AccuracyInfo {
  const percent = cosineToAccuracyPercent(cosineSimilarity);

  if (percent >= 90) {
    return {
      percent,
      band: "exact",
      message: `정확도 ${percent}%로 일치하는 곳을 찾았어요`,
    };
  }
  if (percent >= 70) {
    return {
      percent,
      band: "likely",
      message: `정확도 ${percent}%, 이 곳일 가능성이 높아요`,
    };
  }
  if (percent >= 40) {
    return {
      percent,
      band: "similar",
      message: `정확도 ${percent}%예요. 정확히 일치하진 않지만 가장 비슷한 곳이에요`,
    };
  }
  return {
    percent,
    band: "low",
    message: `정확도 ${percent}%로 확신은 낮지만, 가장 가까운 결과예요. 실제 장소와 다를 수 있어요`,
  };
}

export const LOW_ACCURACY_DISCLAIMER =
  "정확도가 낮을 경우 실제 장소와 다를 수 있어요";
