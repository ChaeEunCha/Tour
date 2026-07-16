import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// place_embeddings는 공개 select 정책이 없어 anon key로는 조회할 수 없다 (DB.md 참고).
// 매칭 엔진(임베딩 검색, 검색 로그 기록/조회, 업로드 저장)은 RLS를 우회하는
// service_role 키로만 동작한다. 서버 전용 — 절대 브라우저 번들에 포함하지 말 것.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
