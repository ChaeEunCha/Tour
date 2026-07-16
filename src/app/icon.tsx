import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 64 64">
          <circle
            cx="26"
            cy="26"
            r="15"
            fill="none"
            stroke="#1E8A82"
            strokeWidth="6"
          />
          <line
            x1="37"
            y1="37"
            x2="52"
            y2="52"
            stroke="#1E8A82"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M26 14c-5.8 0-10.5 4.4-10.5 10.2C15.5 31.5 26 42 26 42s10.5-10.5 10.5-17.8C36.5 18.4 31.8 14 26 14z"
            fill="#F2704F"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
