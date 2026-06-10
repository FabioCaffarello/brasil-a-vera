#!/usr/bin/env bash
# .github/scripts/consolidation-guard.sh
# Guard da dívida de consolidação RDS (ADR-033; fase F9/H5 da auditoria
# do harness, 2026-06-10). Consumido por
# .github/workflows/consolidation-guard.yml e executável localmente:
#
#   printf 'src/components/partido/header.tsx\n' | \
#     bash .github/scripts/consolidation-guard.sh
#
# Entrada: lista de arquivos alterados no PR (um por linha) via stdin.
# Fonte de pares: docs/migration/consolidation-debt.md (linhas de tabela
# com `original` e `copia-rds` nas duas primeiras células).
# Saída: avisos em markdown no stdout (vazio = nada a apontar).
# Exit codes: 0 = ok, com ou sem avisos (advisory);
#             2 = tabela ilegível — falha fechado, nunca verde cego.
set -uo pipefail

DEBT_MD="${1:-docs/migration/consolidation-debt.md}"

if [ ! -f "$DEBT_MD" ]; then
  echo "ERRO: $DEBT_MD não existe — guard não pode operar." >&2
  exit 2
fi

# Pares (original, cópia): linhas de tabela com dois paths em backtick.
pairs=$(grep '^|' "$DEBT_MD" | sed -n 's/^| *`\([^`]*\)` *| *`\([^`]*\)` *|.*/\1 \2/p')
if [ -z "$pairs" ]; then
  echo "ERRO: nenhuma linha de par lida de $DEBT_MD — tabela reformatada?" >&2
  echo "Guard falha fechado em vez de passar verde sem ler nada." >&2
  exit 2
fi

changed=$(cat)
warn=""

# Checagens 1 e 2: um lado do par alterado sem o outro (política de
# espelhamento do consolidation-debt.md).
while read -r orig copia; do
  [ -z "$orig" ] && continue
  o=0; c=0
  printf '%s\n' "$changed" | grep -qxF "$orig" && o=1
  printf '%s\n' "$changed" | grep -qxF "$copia" && c=1
  if [ "$o" -eq 1 ] && [ "$c" -eq 0 ]; then
    warn="$warn"$'\n'"- Original \`$orig\` alterado sem a cópia-rds \`$copia\`. Espelhe a mudança ou registre na tabela por que não se aplica."
  elif [ "$c" -eq 1 ] && [ "$o" -eq 0 ]; then
    warn="$warn"$'\n'"- Cópia-rds \`$copia\` alterada sem o original \`$orig\`. Ajuste descoberto em /rds/ deve ser portado pro original ou virar PR de consolidação."
  fi
done <<< "$pairs"

# Checagem 3 (assert inverso): cópia-rds nova sob _components/ de rota
# /rds/ sem registro na tabela deixaria o guard cego por construção —
# a tabela é enforçada, não voluntária (lição ROLES.md ↔ matchers).
copies=$(printf '%s\n' "$pairs" | awk '{print $2}')
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    src/app/rds/*/_components/*) ;;
    *) continue ;;
  esac
  printf '%s\n' "$copies" | grep -qxF "$f" || \
    warn="$warn"$'\n'"- \`$f\` está sob \`_components/\` de rota /rds/ mas não consta na tabela de pares de \`$DEBT_MD\`. Registre o par (ou anote que é componente novo sem original) — sem registro, o guard não o vigia."
done <<< "$changed"

if [ -n "$warn" ]; then
  printf '%s\n' "$warn" | sed '/^$/d'
fi
exit 0
