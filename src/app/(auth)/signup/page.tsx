import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="bg-bg-raised border border-border rounded-2xl p-8 flex flex-col gap-6">
      <SignupForm />
      <p className="text-center text-[13px] text-text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-accent font-semibold">
          로그인
        </Link>
      </p>
    </div>
  );
}
