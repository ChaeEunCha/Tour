const CACHE_NAME = "where-is-it-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 검색 결과/저장 목록 등 항상 최신이어야 하는 데이터가 많은 앱이라
// network-first로 두고, 네트워크 실패(오프라인) 시에만 캐시로 폴백한다.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
