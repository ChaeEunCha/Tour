"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/match/exact", label: "정확한 곳 찾기" },
  { href: "/match/similar", label: "유사한 관광지 찾기" },
  { href: "/map", label: "지도" },
  { href: "/mypage", label: "저장함" },
];

export function TopBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = user?.user_metadata?.name ?? user?.email ?? "";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-6 py-4">
        <Link href="/" className="font-display font-bold text-lg">
          어디있을까<span className="text-primary">?</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text hover:bg-bg-raised"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-raised py-1.5 shadow-[0_8px_24px_rgba(43,35,32,0.12)]">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-[13.5px] text-text hover:bg-accent-soft"
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-1 border-t border-border" />

              {checkingAuth ? null : user ? (
                <>
                  <p className="truncate px-4 py-2 text-[12px] text-text-muted">
                    {displayName}
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2.5 text-left text-[13.5px] text-similar-fg hover:bg-accent-soft"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-[13.5px] text-text hover:bg-accent-soft"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-[13.5px] font-semibold text-primary hover:bg-accent-soft"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
