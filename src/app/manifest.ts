import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "어디있을까?",
    short_name: "어디있을까?",
    description: "사진 한 장으로 그 장소를 다시 찾아드려요.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF8",
    theme_color: "#F2704F",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-icon-512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
