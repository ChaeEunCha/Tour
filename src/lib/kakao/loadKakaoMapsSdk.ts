let loadPromise: Promise<typeof window.kakao> | null = null;

export function loadKakaoMapsSdk(): Promise<typeof window.kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("loadKakaoMapsSdk는 브라우저 환경에서만 호출할 수 있습니다."),
    );
  }

  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appKey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다."));
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
