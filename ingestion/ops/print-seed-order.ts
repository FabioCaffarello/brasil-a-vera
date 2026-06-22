import { SOURCES } from '../registry'
import { buildSeedOrder } from './seed-order'

// Entry-point consumido pelo scripts/seed-local.sh:
//   STEPS="$(npx tsx ingestion/ops/print-seed-order.ts)"
// Imprime um script npm por linha, na ordem de dependência derivada do registry
// (ver seed-order.ts). Sem GITHUB_OUTPUT, sem DB, sem rede — não há side-effect
// destrutivo, então não precisa de DRY_RUN guard (igual ao print-matrix.ts).

for (const step of buildSeedOrder(SOURCES)) {
  console.log(step)
}
