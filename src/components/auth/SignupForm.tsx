"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);

  const emailValid = EMAIL_REGEX.test(email);
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    name.trim().length > 0 &&
    emailValid &&
    passwordValid &&
    passwordsMatch &&
    agreedToTerms &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setFormError("이미 가입된 이메일이에요.");
      } else {
        setFormError(error.message);
      }
      return;
    }

    if (data.session) {
      router.push("/");
    } else {
      setPendingEmailConfirm(true);
    }
  }

  if (pendingEmailConfirm) {
    return (
      <div className="flex flex-col items-center gap-2 text-center py-8">
        <p className="text-[15px] font-semibold">가입을 확인해주세요</p>
        <p className="text-[13.5px] text-text-muted max-w-[32ch]">
          {email}로 인증 메일을 보냈어요. 메일함에서 인증을 완료하면 로그인할
          수 있어요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      <Input
        label="이름"
        name="name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="홍길동"
      />
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
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        helperText="8자 이상 입력해주세요"
        error={
          password.length > 0 && !passwordValid
            ? "비밀번호는 8자 이상이어야 해요"
            : undefined
        }
      />
      <Input
        label="비밀번호 확인"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={
          confirmPassword.length > 0 && !passwordsMatch
            ? "비밀번호가 일치하지 않아요"
            : undefined
        }
      />

      <label className="flex items-center gap-2 text-[13px] text-text-muted">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        이용약관 및 개인정보 처리방침에 동의해요
      </label>

      {formError && (
        <p className="text-[13px] text-similar-fg -mt-2">{formError}</p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {submitting ? "가입하는 중..." : "가입하기"}
      </Button>
    </form>
  );
}
