#!/usr/bin/env bash
# .claude/hooks/post-edit-tokens.sh
# PostToolUse: Edit | Write | MultiEdit
# Lembrete não-bloqueante após edição em arquivo de UI/CSS.
# Sempre exit 0 — apenas imprime aviso em stderr quando aplicável.

set -uo pipefail

PAYLOAD=$(cat)
TOOL_NAME=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // ""')
FILE_PATH=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // ""')

case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  *.tsx|*.css) ;;
  *) exit 0 ;;
esac

cat >&2 <<MSG
[BAV post-edit-tokens] Edição em UI detectada: ${FILE_PATH##*/}
Rode \`/design-token-check\` antes de abrir o PR para confirmar que
não introduzimos zinc/HEX legacy no design system.
MSG

exit 0
