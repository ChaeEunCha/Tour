"use client";

import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/upload/ImageUploader";

export default function SimilarMatchPage() {
  const router = useRouter();

  async function handleSubmit(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("mode", "similar");

    const res = await fetch("/api/match", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "매칭에 실패했어요.");
    }
    if (!data.searchId) {
      throw new Error("아직 등록된 관광지 데이터가 없어 결과를 보여드릴 수 없어요.");
    }
    router.push(`/match/similar/${data.searchId}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">유사한 관광지 찾기</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          사진을 올리면 분위기가 비슷한 관광지 상위 3곳을 보여드려요
        </p>
      </div>
      <ImageUploader onSubmit={handleSubmit} submitLabel="비슷한 장소 찾기" />
    </div>
  );
}
