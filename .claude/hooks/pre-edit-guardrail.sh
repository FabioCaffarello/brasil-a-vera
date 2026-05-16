#!/usr/bin/env bash
# .claude/hooks/pre-edit-guardrail.sh
# PreToolUse: Edit | Write | MultiEdit
# Bloqueia edição em paths protegidos pelo role atual (.claude/docs/ROLES.md).
# Exit 0 = permite. Exit 2 = bloqueia (Claude mostra stderr ao usuário).

set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/role-detect.sh
source "$HOOKS_DIR/lib/role-detect.sh"
# shellcheck source=lib/path-matchers.sh
source "$HOOKS_DIR/lib/path-matchers.sh"

PAYLOAD=$(cat)
TOOL_NAME=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // ""')
FILE_PATH=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // ""')

case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
RELATIVE_PATH="${FILE_PATH#"$REPO_ROOT"/}"
RELATIVE_PATH="${RELATIVE_PATH#./}"

ROLE=$(bav_role)

if is_blocked_for_role "$RELATIVE_PATH" "$ROLE"; then
  cat >&2 <<MSG
[BAV pre-edit-guardrail] Edição BLOQUEADA para role "$ROLE":
  $RELATIVE_PATH

Esse caminho é protegido pela matriz em .claude/docs/ROLES.md.

Como prosseguir:
  - Designer: abrir issue com label "design" descrevendo a necessidade,
    ou solicitar pareamento com um engineer no canal do time.
  - Engineer: se o bloqueio é intencional (workflows, migrations, .env*),
    esse path requer PR humano explícito fora da sessão Claude.
    Verifique .claude/docs/ROLES.md.

Para mudar de role temporariamente em outra sessão:
  export BAV_CLAUDE_ROLE=engineer
  claude
MSG
  exit 2
fi

# Log local não-bloqueante (apenas engineer, auditoria local — gitignored).
if [ "$ROLE" = "engineer" ]; then
  LOG_FILE="$REPO_ROOT/.claude/.role-log"
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TOOL_NAME" "$RELATIVE_PATH" >> "$LOG_FILE" 2>/dev/null || true
fi

exit 0
