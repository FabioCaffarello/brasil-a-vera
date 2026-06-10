#!/usr/bin/env bash
# .github/scripts/consolidation-guard.sh
# Guard da dívida de consolidação RDS (ADR-033; fase F9/H5 da auditoria
# do harness, 2026-06-10). Consumido por
# .github/workflows/consolidation-guard.yml e executável localmente:
#
#   printf 'modified\tsrc/components/partido/header.tsx\n' | \
#     bash .github/scripts/consolidation-guard.sh
#
# Entrada: arquivos alterados no PR via stdin, um por linha, no formato
# `STATUS<TAB>path` (status da API do GitHub: added/modified/removed/
# renamed — ou letras do git --name-status: A/M/D/R). Linha SEM tab é
# aceita como path puro e assume status M — conservador: drift de
# formato no chamador gera mais avisos, nunca menos (fix #380).
#
# Fonte de pares: docs/migration/consolidation-debt.md (linhas de tabela
# com `original` e `copia-rds` nas duas primeiras células).
# Saída: avisos em markdown no stdout (vazio = nada a apontar).
# Exit codes: 0 = ok, com ou sem avisos (advisory);
#             2 = tabela ilegível — falha fechado, nunca verde cego.
#
# Partição das checagens sobre cópias-rds (fix #380 — sem buraco):
#   criada (A) e registrada na tabela  → silêncio (caso correto de
#                                        migração: original intocado
#                                        por mandato do playbook)
#   criada (A) fora da tabela          → checagem 3 (assert inverso)
#   modificada (M/D/R) sem o original  → checagem 2 (drift de espelho)
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

# Normaliza stdin para duas listas: todos os paths alterados e o
# subconjunto com status A (added). Status desconhecido ou ausente
# cai em "não-A" (= tratado como modificação; conservador).
changed=""
added=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  if [[ "$line" == *$'\t'* ]]; then
    status="${line%%$'\t'*}"
    f="${line#*$'\t'}"
  else
    status="M"
    f="$line"
  fi
  changed="$changed"$'\n'"$f"
  case "$status" in
    A | a | added | ADDED) added="$added"$'\n'"$f" ;;
  esac
done

# Checagens 1 e 2: um lado do par alterado sem o outro (política de
# espelhamento do consolidation-debt.md). Cópia com status A é isenta
# da checagem 2 — criação não é drift; quem vigia criação é a
# checagem 3 (fix #380).
warn=""
while read -r orig copia; do
  [ -z "$orig" ] && continue
  o=0; c=0; c_added=0
  printf '%s\n' "$changed" | grep -qxF "$orig" && o=1
  printf '%s\n' "$changed" | grep -qxF "$copia" && c=1
  printf '%s\n' "$added" | grep -qxF "$copia" && c_added=1
  if [ "$o" -eq 1 ] && [ "$c" -eq 0 ]; then
    warn="$warn"$'\n'"- Original \`$orig\` alterado sem a cópia-rds \`$copia\`. Espelhe a mudança ou registre na tabela por que não se aplica."
  elif [ "$c" -eq 1 ] && [ "$o" -eq 0 ] && [ "$c_added" -eq 0 ]; then
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
