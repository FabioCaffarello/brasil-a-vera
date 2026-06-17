#!/usr/bin/env bash
#
# Popula o Postgres local (Docker) rodando todas as ingestões em ordem de
# dependência. Bate nas APIs públicas (Câmara/Senado/TSE), NÃO no Neon —
# pensado para desenvolvimento local com a cota do free tier esgotada.
#
# Pré-requisitos:
#   npm run db:local:up      # sobe o postgres:17-alpine
#   npm run db:migrate       # aplica as 18 migrations (use DIRECT_URL local)
#
# Uso:
#   ./scripts/seed-local.sh
#
# Variáveis de ambiente (todas com default para o setup local):
#   DATABASE_URL    conexão (default postgresql://bav:bav@localhost:5432/bav)
#   DIRECT_URL      idem (default = DATABASE_URL)
#   STOP_ON_ERROR   =1 aborta no primeiro erro; default 0 (continua e resume
#                   as falhas no fim — APIs públicas BR são instáveis e os
#                   scripts já fazem retry com backoff)
#   DATA_INICIO / DATA_FIM / ANO  repassados aos scripts que aceitam janela
#                   (proposições, gastos); deixe em branco para os defaults.
#
# Força DB_DRIVER=node-postgres para garantir que tudo vai pro banco local.

set -o pipefail

export DB_DRIVER="node-postgres"
export DATABASE_URL="${DATABASE_URL:-postgresql://bav:bav@localhost:5432/bav}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

STOP_ON_ERROR="${STOP_ON_ERROR:-0}"

# Ordem importa: parlamentares → CPF → proposições → votações → vínculo
# votação/proposição → tramitação → orientações → gastos → bens TSE →
# agregados (que somam sobre tudo).
STEPS="
ingest:camara:deputados
ingest:senado:senadores
backfill:camara:cpf
ingest:camara:proposicoes
ingest:senado:proposicoes
ingest:camara:votacoes
ingest:senado:votacoes
backfill:camara:votacao-proposicao
ingest:camara:tramitacao
ingest:senado:tramitacao
ingest:camara:orientacoes
ingest:camara:gastos
ingest:tse:bens
seed:agregados:parlamentar
seed:agregados:proposicao
"

echo "================================================================"
echo " Populando Postgres LOCAL (DB_DRIVER=node-postgres)"
echo " DATABASE_URL=$DATABASE_URL"
echo " STOP_ON_ERROR=$STOP_ON_ERROR"
echo "================================================================"

failed=""
ok_count=0
all_start=$SECONDS

for step in $STEPS; do
  echo ""
  echo "▶ $step"
  step_start=$SECONDS
  if npm run "$step"; then
    dur=$((SECONDS - step_start))
    echo "✓ $step (${dur}s)"
    ok_count=$((ok_count + 1))
  else
    dur=$((SECONDS - step_start))
    echo "✗ $step FALHOU (${dur}s)"
    failed="$failed $step"
    if [ "$STOP_ON_ERROR" = "1" ]; then
      echo ""
      echo "STOP_ON_ERROR=1 → abortando no primeiro erro."
      break
    fi
  fi
done

total=$((SECONDS - all_start))
echo ""
echo "================================================================"
echo " Concluído em ${total}s — $ok_count etapa(s) com sucesso."
if [ -n "$failed" ]; then
  echo " Falhas:$failed"
  echo "================================================================"
  exit 1
fi
echo " Todas as ingestões rodaram com sucesso."
echo "================================================================"
