#!/usr/bin/env bash
# Test matrix determinística dos hooks Sprint 5.0.
#
# Como rodar:
#   bash .claude/hooks/__tests__/test-hooks.sh
#
# Saída: PASS/FAIL por caso. Exit 0 se todos passaram.

set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$HOOKS_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$REPO_ROOT"

PASS=0
FAIL=0

assert_exit() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" -eq "$actual" ]; then
    echo "  PASS  $description (exit $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $description (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

run_hook() {
  local hook="$1"
  local payload="$2"
  local role="${3:-}"
  local code
  if [ -n "$role" ]; then
    BAV_CLAUDE_ROLE="$role" bash "$HOOKS_DIR/$hook" <<< "$payload" >/dev/null 2>&1
    code=$?
  else
    bash "$HOOKS_DIR/$hook" <<< "$payload" >/dev/null 2>&1
    code=$?
  fi
  printf '%d' "$code"
}

echo "=== pre-edit-guardrail.sh — designer ==="
assert_exit "designer can edit design-system primitive" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/design-system/primitives/button.tsx"}}' designer)"
assert_exit "designer can edit components" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/components/parlamentar/card.tsx"}}' designer)"
assert_exit "designer can edit app route" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":"src/app/parlamentares/page.tsx"}}' designer)"
assert_exit "designer can edit docs/design" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"docs/design/DESIGN-TOKENS.md"}}' designer)"
assert_exit "designer can edit lib/cn.ts" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/lib/cn.ts"}}' designer)"
assert_exit "designer BLOCKED on ingestion" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"ingestion/camara/sync.ts"}}' designer)"
assert_exit "designer BLOCKED on queries" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/lib/queries/parlamentares.ts"}}' designer)"
assert_exit "designer BLOCKED on biome.json" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"biome.json"}}' designer)"
assert_exit "designer BLOCKED on .github/CODEOWNERS" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":".github/CODEOWNERS"}}' designer)"
assert_exit "designer BLOCKED on .env.local" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":".env.local"}}' designer)"
assert_exit "designer BLOCKED on migrations" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":"src/shared/db/migrations/0010_add_x.sql"}}' designer)"
assert_exit "designer BLOCKED on CLAUDE.md" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"CLAUDE.md"}}' designer)"

echo ""
echo "=== pre-edit-guardrail.sh — engineer ==="
assert_exit "engineer can edit queries" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/lib/queries/parlamentares.ts"}}' engineer)"
assert_exit "engineer can edit ingestion" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"ingestion/camara/sync.ts"}}' engineer)"
assert_exit "engineer can edit biome.json" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"biome.json"}}' engineer)"
assert_exit "engineer can edit CLAUDE.md" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":"CLAUDE.md"}}' engineer)"
assert_exit "engineer can edit ADR" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":"docs/architecture/ADR/023-x.md"}}' engineer)"
assert_exit "engineer BLOCKED on .env.local" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{"file_path":".env.local"}}' engineer)"
assert_exit "engineer BLOCKED on migrations" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":"src/shared/db/migrations/0010_add_x.sql"}}' engineer)"
assert_exit "engineer BLOCKED on workflows" 2 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Write","tool_input":{"file_path":".github/workflows/ci.yml"}}' engineer)"

echo ""
echo "=== pre-edit-guardrail.sh — pass-through ==="
assert_exit "Bash tool passes through" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Bash","tool_input":{"command":"npm run dev"}}' designer)"
assert_exit "Read on protected path passes through" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Read","tool_input":{"file_path":"ingestion/camara/sync.ts"}}' designer)"
assert_exit "Empty file_path passes through" 0 \
  "$(run_hook pre-edit-guardrail.sh '{"tool_name":"Edit","tool_input":{}}' designer)"

echo ""
echo "=== post-edit-tokens.sh — sempre exit 0 ==="
assert_exit "Edit on .tsx → exit 0" 0 \
  "$(run_hook post-edit-tokens.sh '{"tool_name":"Edit","tool_input":{"file_path":"src/components/x.tsx"}}')"
assert_exit "Write on .css → exit 0" 0 \
  "$(run_hook post-edit-tokens.sh '{"tool_name":"Write","tool_input":{"file_path":"src/app/globals.css"}}')"
assert_exit "Edit on .md → exit 0 silently" 0 \
  "$(run_hook post-edit-tokens.sh '{"tool_name":"Edit","tool_input":{"file_path":"README.md"}}')"
assert_exit "Bash tool → exit 0" 0 \
  "$(run_hook post-edit-tokens.sh '{"tool_name":"Bash","tool_input":{"command":"ls"}}')"

echo ""
echo "=== pre-commit-quality.sh — pass-through ==="
assert_exit "non-commit bash → exit 0" 0 \
  "$(run_hook pre-commit-quality.sh '{"tool_name":"Bash","tool_input":{"command":"npm run dev"}}')"
assert_exit "non-Bash tool → exit 0" 0 \
  "$(run_hook pre-commit-quality.sh '{"tool_name":"Edit","tool_input":{"file_path":"x.tsx"}}')"

# Comportamentos 1/2/3 do pre-commit-quality.sh dependem do estado de
# `git diff --cached`. Documentamos em README.md do hooks/ e validamos
# manualmente no PR (output literal anexado).

echo ""
echo "=== Summary ==="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
if [ "$FAIL" -ne 0 ]; then exit 1; fi
exit 0
