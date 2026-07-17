import { ImageResponse } from "next/og";
import { PwaIconMark } from "@/lib/pwaIconMark";

export const dynamic = "force-static";

// 마스커블 아이콘: OS가 원형/둥근사각형 등으로 잘라내므로 마크를 안전 영역
// (중앙 반경 40%) 안쪽에 작게 배치하고 배경은 캔버스 전체를 채운다.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBF8",
        }}
      >
        <PwaIconMark size={256} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
