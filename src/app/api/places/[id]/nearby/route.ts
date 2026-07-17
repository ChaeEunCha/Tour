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
