import type { NextConfig } from "next";

// 매칭 결과 썸네일/업로드 사진은 Supabase Storage 공개 URL에서 서빙되므로
// next/image가 최적화할 수 있도록 프로젝트 호스트를 허용 목록에 등록한다.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // 상위 폴더(C:\Users\user)에 있는 이질적인 package-lock.json 때문에 Turbopack이
  // 워크스페이스 루트를 잘못 추론하는 것을 막기 위해 프로젝트 루트를 명시한다.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // 관광지 참고 이미지는 TourAPI(한국관광공사)의 원본 CDN URL을 그대로 저장한다
      // (scripts/ingest-tourapi.mjs 참고) — Supabase Storage로 재업로드하지 않음.
      {
        protocol: "http" as const,
        hostname: "tong.visitkorea.or.kr",
      },
    ],
  },
};

export default nextConfig;
