#!/usr/bin/env bash
# PreToolUse(Bash) gate: before a Vercel deploy command runs, verify
# DEPLOY_CHECKLIST.md items automatically where possible. Blocks the
# deploy (permissionDecision: deny) if any check fails.

set -u
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 0

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"

# Only act on commands that actually invoke a Vercel deploy.
# (bare `vercel`, `vercel deploy`, `vercel --prod`, via npx/pnpm dlx/bunx/yarn dlx)
if ! printf '%s' "$command" | grep -qE '(^|[;&|]\s*)((npx|pnpm dlx|bunx|yarn dlx)\s+)?vercel(\s+.*(deploy|--prod).*|\s*)$'; then
  exit 0
fi

failures=()

# 1. tsc --noEmit clean
if ! npx tsc --noEmit >/tmp/predeploy-tsc.log 2>&1; then
  failures+=("tsc --noEmit 실패 (자세한 내용: /tmp/predeploy-tsc.log)")
fi

# 2. eslint clean
if ! npx eslint . >/tmp/predeploy-eslint.log 2>&1; then
  failures+=("eslint 실패 (자세한 내용: /tmp/predeploy-eslint.log)")
fi

# 3. Tailwind 기본 팔레트 대신 디자인 토큰 사용했는지
if grep -rEn '\b(bg|text|border|fill|stroke)-(zinc|emerald|sky|amber|slate|gray|neutral|stone)-[0-9]+\b' src/ >/tmp/predeploy-palette.log 2>&1; then
  failures+=("디자인 토큰 대신 Tailwind 기본 팔레트 사용 (자세한 내용: /tmp/predeploy-palette.log)")
fi

# 4. 정의되지 않은 dark: variant 없는지 (라이트 전용 프로젝트)
if grep -rn 'dark:' src/ >/tmp/predeploy-dark.log 2>&1; then
  failures+=("불필요한 dark: variant 발견 (자세한 내용: /tmp/predeploy-dark.log)")
fi

# 5. 디버그 console.log 잔존 여부
if grep -rn 'console\.log' src/ >/tmp/predeploy-consolelog.log 2>&1; then
  failures+=("디버그 console.log 잔존 (자세한 내용: /tmp/predeploy-consolelog.log)")
fi

# 6. 서버 전용 시크릿에 NEXT_PUBLIC_ 접두사가 붙지 않았는지
if grep -rEn 'NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|ADMIN)[A-Z0-9_]*' src/ .env.local.example 2>/dev/null >/tmp/predeploy-secretprefix.log; then
  failures+=("서버 전용 시크릿에 NEXT_PUBLIC_ 접두사 사용 (자세한 내용: /tmp/predeploy-secretprefix.log)")
fi

# 7. .env.local이 git에 커밋/스테이징되지 않았는지
if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
  failures+=(".env.local이 git에 커밋되어 있음")
fi
if git diff --cached --name-only 2>/dev/null | grep -qE '^\.env\.local$'; then
  failures+=(".env.local이 staged 상태 (커밋 예정)")
fi

if [ "${#failures[@]}" -gt 0 ]; then
  reason="DEPLOY_CHECKLIST.md 점검 실패:\n"
  for f in "${failures[@]}"; do
    reason="${reason}- ${f}\n"
  done
  reason="${reason}\n(참고: '배포된 env vars가 .env.local.example과 일치하는지'는 Vercel 대시보드에서 수동 확인 필요 — 자동화 불가)"
  jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    },
    systemMessage: $reason
  }'
  exit 0
fi

jq -n '{
  systemMessage: "✅ DEPLOY_CHECKLIST.md 자동 점검 통과 (tsc/eslint/디자인 토큰/dark variant/console.log/시크릿 노출). env var 일치 여부는 수동 확인 필요."
}'
exit 0
