import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface SavePlaceBody {
  tourContentId: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tourContentId = searchParams.get("tourContentId");
  if (!tourContentId) {
    return NextResponse.json({ error: "tourContentId가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ saved: false });
  }

  const { data: place } = await supabase
    .from("places")
    .select("id")
    .eq("tour_content_id", tourContentId)
    .maybeSingle();

  if (!place) {
    return NextResponse.json({ saved: false });
  }

  const { data: saved } = await supabase
    .from("saved_places")
    .select("id")
    .eq("user_id", user.id)
    .eq("place_id", place.id)
    .eq("type", "place")
    .maybeSingle();

  return NextResponse.json({ saved: Boolean(saved) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as SavePlaceBody;
  if (!body.tourContentId) {
    return NextResponse.json({ error: "tourContentId가 필요합니다." }, { status: 400 });
  }

  // places에는 공개 select만 있고 insert/update 정책이 없어 (DB.md) service_role로만 upsert 가능.
  const admin = createAdminClient();
  const { data: place, error: placeError } = await admin
    .from("places")
    .upsert(
      {
        tour_content_id: body.tourContentId,
        name: body.name,
        category: body.category,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
      },
      { onConflict: "tour_content_id" },
    )
    .select("id")
    .single();

  if (placeError || !place) {
    return NextResponse.json(
      { error: `장소 저장 실패: ${placeError?.message ?? "알 수 없는 오류"}` },
      { status: 500 },
    );
  }

  const { error: saveError } = await supabase
    .from("saved_places")
    .upsert(
      { user_id: user.id, place_id: place.id, type: "place" },
      { onConflict: "user_id,place_id,type" },
    );

  if (saveError) {
    return NextResponse.json(
      { error: `저장 실패: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const tourContentId = searchParams.get("tourContentId");
  if (!tourContentId) {
    return NextResponse.json({ error: "tourContentId가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: place } = await supabase
    .from("places")
    .select("id")
    .eq("tour_content_id", tourContentId)
    .maybeSingle();

  if (!place) {
    return NextResponse.json({ saved: false });
  }

  const { error } = await supabase
    .from("saved_places")
    .delete()
    .eq("user_id", user.id)
    .eq("place_id", place.id)
    .eq("type", "place");

  if (error) {
    return NextResponse.json({ error: `저장 취소 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ saved: false });
}
