#!/usr/bin/env bash
# .claude/hooks/lib/path-matchers.sh
# Matchers de path por role. Espelha a matriz em .claude/docs/ROLES.md.
# Mudanças aqui exigem refletir lá (e vice-versa).

# Paths sempre proibidos (mesmo para engineer via Claude).
# Wave 10 (2026-05-19): refinado pelo owner.
#
# Originalmente bloqueava .env*, migrations e workflows como regra
# absoluta — "PR humano deliberado fora da sessão Claude". Decisão
# revisada: migrations e workflows são autoríveis via Claude pelo
# engineer (não designer); permanecem bloqueados para designer via
# `is_blocked_for_designer`. Aqui ficam apenas secrets reais
# (arquivos .env com chaves, .dev.vars do Wrangler).
#
# `.env.example` é safe (documentação; committed) — não entra na lista.
is_always_blocked() {
  local path="$1"
  path="${path#./}"
  case "$path" in
    .env|.env.local|.env.development|.env.production|.env.test)
      return 0 ;;
    .dev.vars)
      return 0 ;;
  esac
  return 1
}

# Paths bloqueados para designer (engineer pode tocar).
is_blocked_for_designer() {
  local path="$1"
  path="${path#./}"
  [[ "$path" =~ ^ingestion/ ]] && return 0
  [[ "$path" =~ ^src/lib/queries/ ]] && return 0
  [[ "$path" =~ ^src/modules/ ]] && return 0
  [[ "$path" =~ ^src/shared/ ]] && return 0
  [[ "$path" =~ ^drizzle\.config\.ts$ ]] && return 0
  [[ "$path" =~ ^biome\.json$ ]] && return 0
  [[ "$path" =~ ^next\.config\.ts$ ]] && return 0
  [[ "$path" =~ ^open-next\.config\.ts$ ]] && return 0
  [[ "$path" =~ ^package(-lock)?\.json$ ]] && return 0
  [[ "$path" =~ ^tsconfig.*\.json$ ]] && return 0
  [[ "$path" =~ ^wrangler\.(toml|jsonc)$ ]] && return 0
  [[ "$path" =~ ^\.github/ ]] && return 0
  [[ "$path" =~ ^docs/architecture/ ]] && return 0
  [[ "$path" =~ ^docs/product/ ]] && return 0
  [[ "$path" =~ ^docs/releases/ ]] && return 0
  [[ "$path" =~ ^\.claude/agents/ ]] && return 0
  [[ "$path" =~ ^\.claude/hooks/ ]] && return 0
  [[ "$path" =~ ^\.claude/settings\.json$ ]] && return 0
  [[ "$path" =~ ^CLAUDE\.md$ ]] && return 0
  [[ "$path" =~ ^AGENTS\.md$ ]] && return 0
  # Wave 10: migrations + workflows não são mais "always blocked".
  # Designer continua bloqueado aqui; engineer (Frente C — env var
  # BAV_CLAUDE_ROLE=engineer ou via .claude/settings.local.json)
  # destrava ambos.
  [[ "$path" =~ ^src/shared/db/migrations/ ]] && return 0
  [[ "$path" =~ ^\.github/workflows/ ]] && return 0
  return 1
}

# is_blocked_for_role <path> <role> → exit 0 se bloqueado, 1 se permitido.
is_blocked_for_role() {
  local path="$1"
  local role="$2"
  is_always_blocked "$path" && return 0
  if [ "$role" = "designer" ]; then
    is_blocked_for_designer "$path" && return 0
  fi
  return 1
}
