"use client";

import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/upload/ImageUploader";

export default function ExactMatchPage() {
  const router = useRouter();

  async function handleSubmit(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("mode", "exact");

    const res = await fetch("/api/match", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "매칭에 실패했어요.");
    }
    if (!data.searchId) {
      throw new Error("아직 등록된 관광지 데이터가 없어 결과를 보여드릴 수 없어요.");
    }
    router.push(`/match/exact/${data.searchId}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">정확히 일치하는 곳 찾기</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          사진을 올리면 가장 일치하는 관광지 1곳을 정확도와 함께 알려드려요
        </p>
      </div>
      <ImageUploader onSubmit={handleSubmit} submitLabel="정확한 장소 찾기" />
    </div>
  );
}
