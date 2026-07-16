import { NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/tourapi/places";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const place = await getPlaceDetail(id);
    if (!place) {
      return NextResponse.json({ error: "장소를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(place);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
