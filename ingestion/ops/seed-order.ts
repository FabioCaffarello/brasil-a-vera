import type { Cadence, IngestionSource } from '../registry'

// Lógica PURA (sem IO) que deriva a ORDEM de execução do seed local a partir do
// registry (ingestion/registry.ts). O entry-point com IO (imprime em stdout)
// vive em print-seed-order.ts — split obrigatório p/ o vitest não acionar
// main() no import (cf. padrão de matrix-builder.ts / print-matrix.ts).
//
// Por que existir: o seed-local.sh tinha uma lista STEPS hardcoded que divergiu
// do registry (a fonte de verdade dos crons de prod). Derivar o CONJUNTO daqui
// elimina a causa-raiz do drift — todo produtor do registry entra automático.
// A ORDEM continua uma policy explícita pequena (abaixo) porque os `tier` do
// registry são escopados POR CADÊNCIA, não uma topo-order global.

// Bloco de execução por cadência, em ordem de dependência crescente. Dentro de
// cada cadência respeitamos o `tier` do registry (que já é o DAG local daquela
// cadência); entre cadências, daily → weekly → monthly aproxima a dependência.
const CADENCE_RANK: Record<Cadence, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
}

// Hoists cirúrgicos — onde o (cadência, tier) do registry NÃO é uma ordem
// válida para um seed single-shot (DB frio, sem estado de run anterior):
//
//   - Roots de parlamentar (deputados, senadores): votações/proposições
//     referenciam parlamentar. O registry põe `senado-senadores` em daily/t1,
//     enquanto `senado-votacoes` é daily/t0 — em PROD o votacoes-t0 acha os
//     senadores do run ANTERIOR, mas num seed fresco senado-votacoes roda antes
//     e falha ("nenhum parlamentar SENADO no banco"). Os dois roots vão para
//     tier -1, antes de qualquer votação/proposição. (Gap latente do registry
//     no cold-start de prod rastreado na issue #545.)
//   - `backfill:camara:cpf`: monthly/t0 no registry, mas preenche
//     parlamentar.cpf (depende só de deputados) e é pré-requisito do tse-bens
//     (monthly/t1). Sem o hoist cairia no fim, longe dos parlamentares.
//     Posição: daily, tier 1.5 (após os roots/proposições de t1, antes do t2).
const HOIST: ReadonlyMap<string, { cadence: Cadence; tier: number }> = new Map([
  ['ingest:camara:deputados', { cadence: 'daily', tier: -1 }],
  ['ingest:senado:senadores', { cadence: 'daily', tier: -1 }],
  ['backfill:camara:cpf', { cadence: 'daily', tier: 1.5 }],
])

// Pós-processamento que soma sobre TUDO — não são ingestões, então não vivem no
// registry. Cauda fixa, sempre por último e nesta ordem.
export const AGGREGATE_STEPS: readonly string[] = [
  'seed:agregados:parlamentar',
  'seed:agregados:proposicao',
]

function sortKey(source: IngestionSource): [number, number, number] {
  const hoisted = HOIST.get(source.script)
  const cadence = hoisted?.cadence ?? source.cadence
  const tier = hoisted?.tier ?? source.tier
  return [CADENCE_RANK[cadence], tier, 0]
}

// Deriva a lista ordenada de scripts npm que o seed local deve rodar: todos os
// produtores do registry (na ordem global acima) + os agregados na cauda.
export function buildSeedOrder(sources: readonly IngestionSource[]): string[] {
  const ingestion = sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const ka = sortKey(a.source)
      const kb = sortKey(b.source)
      // [cadenceRank, tier, índiceOriginal] — o índice original é o desempate
      // estável (preserva a ordem do array do registry dentro do mesmo tier).
      return ka[0] - kb[0] || ka[1] - kb[1] || a.index - b.index
    })
    .map((entry) => entry.source.script)

  return [...ingestion, ...AGGREGATE_STEPS]
}
