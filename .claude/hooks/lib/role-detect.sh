#!/usr/bin/env bash
# .claude/hooks/lib/role-detect.sh
# Source library — resolve o role atual a partir de BAV_CLAUDE_ROLE.
# Default é "designer" (mais restritivo, ver .claude/docs/ROLES.md).

bav_role() {
  local role="${BAV_CLAUDE_ROLE:-designer}"
  case "$role" in
    designer|engineer) printf '%s' "$role" ;;
    *) printf '%s' designer ;;
  esac
}
