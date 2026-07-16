import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;

  // 비로그인 검색은 search_logs.user_id가 null이라 anon key RLS로는 되읽을 수
  // 없으므로, 결과 페이지 재조회도 service_role로 수행한다. UUID 자체가
  // 추측 불가능한 값이라 F-03/F-04 비로그인 플로우에서는 이 정도로 충분하다.
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("search_logs")
    .select("id, mode, uploaded_image_url, top_matches")
    .eq("id", searchId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "검색 결과를 찾을 수 없어요." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    searchId: data.id,
    mode: data.mode,
    uploadedImageUrl: data.uploaded_image_url,
    results: data.top_matches ?? [],
  });
}
