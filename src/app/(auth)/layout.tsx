export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px] flex flex-col gap-8">
        <div className="text-center">
          <p className="font-display font-bold text-2xl">
            어디있을까<span className="text-primary">?</span>
          </p>
          <p className="mt-1.5 text-[13.5px] text-text-muted">
            사진 한 장으로 그 장소를 다시 찾아드려요
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
