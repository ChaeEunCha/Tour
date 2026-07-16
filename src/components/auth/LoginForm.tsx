"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailValid = EMAIL_REGEX.test(email);
  const canSubmit = emailValid && password.length > 0 && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setFormError("이메일 또는 비밀번호가 올바르지 않아요.");
      } else {
        setFormError(error.message);
      }
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      <Input
        label="이메일"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={
          email.length > 0 && !emailValid
            ? "이메일 형식을 확인해주세요"
            : undefined
        }
      />
      <Input
        label="비밀번호"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {formError && (
        <p className="text-[13px] text-similar-fg -mt-2">{formError}</p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {submitting ? "로그인하는 중..." : "로그인"}
      </Button>
    </form>
  );
}
