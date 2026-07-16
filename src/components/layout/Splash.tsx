"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/layout/SplashScreen";

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
    <SplashScreen
      fading={fading}
      message={
        <>
          어디있을까<span className="text-primary">?</span>
        </>
      }
    />
  );
}
