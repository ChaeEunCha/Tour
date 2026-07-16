import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 w-full max-w-[480px] mx-auto px-6 py-10">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
