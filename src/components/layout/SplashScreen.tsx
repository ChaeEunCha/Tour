import { Mascot } from "@/components/layout/Mascot";

interface SplashScreenProps {
  message: React.ReactNode;
  fading?: boolean;
}

export function SplashScreen({ message, fading = false }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <Mascot size={96} />
      <p className="font-display font-bold text-xl">{message}</p>
    </div>
  );
}
