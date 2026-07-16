"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/layout/Mascot";

const DISPLAY_MS = 900;
const FADE_MS = 300;

export function Splash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const displayMs = reduced ? 0 : DISPLAY_MS;
    const fadeMs = reduced ? 0 : FADE_MS;

    const fadeTimer = setTimeout(() => setFading(true), displayMs);
    const hideTimer = setTimeout(() => setVisible(false), displayMs + fadeMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <Mascot size={96} />
      <p className="font-display font-bold text-xl">
        어디있을까<span className="text-primary">?</span>
      </p>
    </div>
  );
}
