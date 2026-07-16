import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "어디있을까?",
  description: "사진 한 장으로 그 장소를 다시 찾아드려요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
