#!/usr/bin/env bash
# .claude/hooks/pre-commit-quality.sh
# PreToolUse: Bash matcher com `git commit` no comando.
# Roda `vitest related` em arquivos staged TS/TSX. Husky cobre Biome —
# este hook complementa, não duplica.
#
# Comportamentos:
#   1) Staged vazio em TS/TSX → exit 0 silencioso
#   2) Staged COM testes relacionados → roda vitest; falha se vitest falhar
#   3) Staged SEM testes relacionados → exit 0 + aviso amigável

set -uo pipefail

PAYLOAD=$(cat)
TOOL_NAME=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // ""')
COMMAND=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // ""')

if [ "$TOOL_NAME" != "Bash" ]; then exit 0; fi
case "$COMMAND" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

if [ -z "$STAGED" ]; then
  # Comportamento 1
  exit 0
fi

echo "[BAV pre-commit-quality] Running 'npx vitest related --run' on staged TS/TSX..." >&2

EXIT_CODE=0
# shellcheck disable=SC2086
OUTPUT=$(npx vitest related $STAGED --run 2>&1) || EXIT_CODE=$?

if printf '%s' "$OUTPUT" | grep -q "No test files found"; then
  # Comportamento 3
  echo "[BAV pre-commit-quality] 0 testes relacionados aos arquivos staged." >&2
  echo "[BAV pre-commit-quality] Considere adicionar smoke test se for primitiva ou lógica nova." >&2
  exit 0
fi

if [ "$EXIT_CODE" -ne 0 ]; then
  # Comportamento 2b: vitest falhou de verdade
  printf '%s\n' "$OUTPUT" >&2
  echo "[BAV pre-commit-quality] Vitest FAILED. Commit bloqueado." >&2
  exit 2
fi

# Comportamento 2a
echo "[BAV pre-commit-quality] Vitest related passou." >&2
exit 0
