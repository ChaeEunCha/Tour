import { ImageResponse } from "next/og";
import { PwaIconMark } from "@/lib/pwaIconMark";

export const dynamic = "force-static";

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
        <PwaIconMark size={370} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
