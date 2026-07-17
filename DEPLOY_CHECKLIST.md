# 배포 전 점검 체크리스트

## 1. 불필요한 컨벤션 위반 코드 없는지

- [ ] `npx tsc --noEmit`, `npx eslint .` 둘 다 에러 없이 통과
- [ ] Tailwind 기본 팔레트(`zinc`/`emerald`/`sky` 등) 대신 `DESIGN_SYSTEM.md` 토큰(`bg-raised`, `text-muted`, `accent`, `success` 등)만 사용했는지
- [ ] 정의되지 않은 `dark:` variant가 새로 들어가지 않았는지 (이 프로젝트는 라이트 전용)
- [ ] 디버그용 `console.log` / 임시 주석 처리 코드 남아있지 않은지

## 2. 민감 정보가 노출되는 곳이 없는지

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 등 서버 전용 키가 `NEXT_PUBLIC_` 접두사 붙거나 클라이언트 컴포넌트/응답에 노출되지 않는지
- [ ] `.env.local`이 커밋되지 않았는지 (`git status`, `.gitignore`의 `.env*` 규칙 확인)
- [ ] 배포 환경(Vercel 등)에 `.env.local.example` 기준으로 실제 키가 모두 등록돼 있는지
- [ ] 에러 응답/로그에 API 키·DB 연결 정보 등이 그대로 찍히지 않는지
