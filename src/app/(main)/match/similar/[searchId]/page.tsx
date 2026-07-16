import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchResultCard } from "@/components/match/MatchResultCard";
import { LOW_ACCURACY_DISCLAIMER } from "@/lib/match/accuracy";
import type { PlaceMatch } from "@/lib/match/engine";

export default async function SimilarMatchResultPage({
  params,
}: {
  params: Promise<{ searchId: string }>;
}) {
  const { searchId } = await params;
  // 비로그인 검색(user_id null)은 anon key RLS로 되읽을 수 없어 service_role로 조회한다.
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("search_logs")
    .select("uploaded_image_url, top_matches")
    .eq("id", searchId)
    .eq("mode", "similar")
    .single();

  if (error || !data) {
    notFound();
  }

  // F-04: 상위 3건을 정확도(%) 내림차순으로 나열
  const results = ((data.top_matches ?? []) as PlaceMatch[]).slice().sort(
    (a, b) => b.accuracyPercent - a.accuracyPercent
  );
  const hasLowAccuracy = results.some((r) => r.accuracyPercent < 40);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold">비슷한 장소들</h1>

      {data.uploaded_image_url && (
        <Image
          src={data.uploaded_image_url}
          alt="업로드한 사진"
          width={160}
          height={160}
          className="h-40 w-40 rounded-2xl object-cover"
        />
      )}

      {results.length > 0 ? (
        <div className="flex w-full max-w-md flex-col gap-4">
          {results.map((result) => (
            <MatchResultCard key={result.placeId} result={result} />
          ))}
          {hasLowAccuracy && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              {LOW_ACCURACY_DISCLAIMER}
            </p>
          )}
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">
          아직 등록된 관광지 데이터가 없어 결과를 보여드릴 수 없어요.
        </p>
      )}
    </div>
  );
}
