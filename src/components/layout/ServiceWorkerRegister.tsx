"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패해도 앱 자체는 서비스워커 없이 정상 동작하므로 조용히 무시한다.
      });
    }
  }, []);

  return null;
}
