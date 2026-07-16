import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="bg-bg-raised border border-border rounded-2xl p-8 flex flex-col gap-6">
      <LoginForm />
      <p className="text-center text-[13px] text-text-muted">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="text-accent font-semibold">
          회원가입
        </Link>
      </p>
    </div>
  );
}
