import { Mascot } from "@/components/layout/Mascot";

interface SplashScreenProps {
  message: React.ReactNode;
  fading?: boolean;
  loading?: boolean;
}

export function SplashScreen({ message, fading = false, loading = false }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {loading && (
          <div className="absolute -inset-3 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        )}
        <Mascot size={96} />
      </div>
      <p className="font-display font-bold text-xl">{message}</p>
    </div>
  );
}
