import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImageEmbedding, EmbeddingError } from "@/lib/embedding/clip";
import { findMatchingPlaces, type MatchMode } from "@/lib/match/engine";

// 비기능 요구사항: 이미지 업로드 용량 제한 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");
  const mode = formData.get("mode");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "image 파일이 필요합니다." },
      { status: 400 }
    );
  }
  if (mode !== "exact" && mode !== "similar") {
    return NextResponse.json(
      { error: "mode는 'exact' 또는 'similar'여야 합니다." },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "JPEG, PNG, WEBP 이미지만 업로드할 수 있어요." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "이미지 용량은 10MB 이하여야 해요." },
      { status: 400 }
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      {
        error:
          "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았어요.",
      },
      { status: 500 }
    );
  }
  const matchMode = mode as MatchMode;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // place_embeddings 조회 및 search_logs 기록은 RLS를 우회하는 service_role로만 수행한다
    // (DB.md: place_embeddings는 공개 select 정책이 없음).
    const admin = createAdminClient();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const extension = file.type.split("/")[1] ?? "jpg";
    const storagePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await admin.storage
      .from("uploads")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: `이미지 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl: uploadedImageUrl },
    } = admin.storage.from("uploads").getPublicUrl(storagePath);

    const embedding = await getImageEmbedding(buffer, file.type);
    const results = await findMatchingPlaces(admin, embedding, matchMode);

    const top = results[0];
    if (!top) {
      // search_logs.accuracy/uploaded_image_url은 NOT NULL이라 후보가 하나도
      // 없을 때는 로그를 남기지 않고 빈 결과만 반환한다 (아직 place_embeddings 데이터 없음).
      return NextResponse.json({
        searchId: null,
        mode: matchMode,
        uploadedImageUrl,
        results: [],
      });
    }

    const { data: logRow, error: logError } = await admin
      .from("search_logs")
      .insert({
        user_id: user?.id ?? null,
        mode: matchMode,
        uploaded_image_url: uploadedImageUrl,
        matched_place_id: top.placeId,
        accuracy: top.accuracyPercent,
        top_matches: results,
      })
      .select("id")
      .single();

    if (logError) {
      return NextResponse.json(
        { error: `검색 기록 저장 실패: ${logError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      searchId: logRow.id,
      mode: matchMode,
      uploadedImageUrl,
      results,
    });
  } catch (err) {
    if (err instanceof EmbeddingError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
