import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Splash } from "@/components/layout/Splash";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "어디있을까?",
  description: "사진 한 장으로 그 장소를 다시 찾아드려요.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "어디있을까?",
  },
};

export const viewport: Viewport = {
  themeColor: "#F2704F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-bg text-text">
        <ServiceWorkerRegister />
        <Splash />
        {children}
      </body>
    </html>
  );
}
