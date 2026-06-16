import type { Cadence, IngestionSource } from '../registry'

// Lógica PURA (sem IO) que transforma o registry numa matrix por tier para o
// GitHub Actions. O entry-point com IO (lê env, escreve $GITHUB_OUTPUT) vive em
// print-matrix.ts — split obrigatório p/ o vitest não acionar main() no import.

// O que cada job da matrix precisa. Campos extras do registry (cadence, tier)
// ficam de fora — o workflow já está particionado por cadência/tier.
export type MatrixEntry = {
  id: string
  script: string
  context: string
  timeoutMin: number
}

function toEntry(source: IngestionSource): MatrixEntry {
  return {
    id: source.id,
    script: source.script,
    context: source.context,
    timeoutMin: source.timeoutMin,
  }
}

// Retorna um array indexado por tier: result[0] = entradas do tier 0, etc.
// Tiers são contíguos (garantido pelo registry.test.ts), então não há buracos.
// Cadência sem nenhuma entrada (ex. 'monthly' hoje) retorna [].
export function buildTierMatrices(
  sources: readonly IngestionSource[],
  cadence: Cadence,
): MatrixEntry[][] {
  const filtered = sources.filter((s) => s.cadence === cadence)
  if (filtered.length === 0) {
    return []
  }
  const maxTier = Math.max(...filtered.map((s) => s.tier))
  const tiers: MatrixEntry[][] = []
  for (let tier = 0; tier <= maxTier; tier++) {
    tiers.push(filtered.filter((s) => s.tier === tier).map(toEntry))
  }
  return tiers
}
