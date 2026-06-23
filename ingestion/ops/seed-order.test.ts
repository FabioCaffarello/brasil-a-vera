import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { IngestionSource } from '../registry'
import { SOURCES } from '../registry'
import { AGGREGATE_STEPS, buildSeedOrder } from './seed-order'

describe('buildSeedOrder', () => {
  const order = buildSeedOrder(SOURCES)

  // O guard anti-drift: o seed local deve rodar EXATAMENTE os produtores do
  // registry (a fonte de verdade dos crons) + os agregados — nada a menos
  // (drift que motivou esta mudança: filiacoes/discursos/etc. faltando), nada
  // a mais, sem duplicatas.
  it('cobre todo produtor do registry, sem extras nem duplicatas', () => {
    const ingestion = order.filter((s) => !AGGREGATE_STEPS.includes(s))
    const registryScripts = SOURCES.map((s) => s.script)

    expect(ingestion.slice().sort()).toEqual(registryScripts.slice().sort())
    expect(new Set(order).size).toBe(order.length)
  })

  it('agrega (seed:agregados:*) por último, somando sobre tudo', () => {
    expect(order.slice(-AGGREGATE_STEPS.length)).toEqual([...AGGREGATE_STEPS])
  })

  it('os agregados não vazam para o registry (não são ingestão)', () => {
    const registryScripts = new Set(SOURCES.map((s) => s.script))
    for (const agg of AGGREGATE_STEPS) {
      expect(registryScripts.has(agg)).toBe(false)
    }
  })

  it('respeita o DAG global: parlamentar antes do que depende dele', () => {
    const at = (script: string) => order.indexOf(script)

    // deputados primeiro de todos.
    expect(at('ingest:camara:deputados')).toBe(0)

    // Roots de parlamentar antes das votações que os referenciam. Invariante de
    // DB frio: senado-votacoes não pode rodar antes de senado-senadores, senão
    // o produtor dá throw. Agora garantido pelo registry (senadores daily/t0,
    // votacoes daily/t1 — #545), não por hoist no seed.
    expect(at('ingest:senado:senadores')).toBeLessThan(
      at('ingest:senado:votacoes'),
    )
    expect(at('ingest:senado:senadores')).toBeLessThan(
      at('ingest:camara:votacoes'),
    )

    // backfill-cpf (hoisted) roda depois dos parlamentares e antes do tse-bens
    // (que depende dele) e dos blocos weekly/monthly.
    expect(at('backfill:camara:cpf')).toBeGreaterThan(
      at('ingest:senado:senadores'),
    )
    expect(at('backfill:camara:cpf')).toBeLessThan(at('ingest:tse:bens'))
    expect(at('backfill:camara:cpf')).toBeLessThan(at('ingest:camara:gastos'))

    // vínculo votação→proposição depois das proposições da casa.
    expect(at('backfill:camara:votacao-proposicao')).toBeGreaterThan(
      at('ingest:camara:proposicoes'),
    )
    expect(at('backfill:senado:votacao-proposicao')).toBeGreaterThan(
      at('ingest:senado:proposicoes'),
    )

    // orientação do Senado depois da votação do Senado (casa por conteúdo).
    expect(at('ingest:senado:orientacoes')).toBeGreaterThan(
      at('ingest:senado:votacoes'),
    )

    // tse-bens é a última ingestão, antes só dos agregados.
    const ingestion = order.filter((s) => !AGGREGATE_STEPS.includes(s))
    expect(ingestion.at(-1)).toBe('ingest:tse:bens')
  })

  it('mantém daily → weekly → monthly (salvo o hoist do cpf)', () => {
    const rank = new Map(SOURCES.map((s) => [s.script, s.cadence] as const))
    const cadenceRank = { daily: 0, weekly: 1, monthly: 2 } as const
    const ingestion = order
      .filter((s) => !AGGREGATE_STEPS.includes(s))
      // cpf é monthly mas hoisted para junto dos parlamentares — exceção
      // intencional, fora do invariante monotônico.
      .filter((s) => s !== 'backfill:camara:cpf')

    let prev = -1
    for (const script of ingestion) {
      const cadence = rank.get(script)
      if (!cadence) {
        throw new Error(`script fora do registry: ${script}`)
      }
      const current = cadenceRank[cadence]
      expect(current).toBeGreaterThanOrEqual(prev)
      prev = current
    }
  })

  it('é estável e determinístico para um registry sintético', () => {
    const fake: IngestionSource[] = [
      {
        id: 'b',
        script: 's:weekly',
        context: 'c-b',
        cadence: 'weekly',
        tier: 0,
        timeoutMin: 5,
      },
      {
        id: 'a',
        script: 's:daily-t1',
        context: 'c-a',
        cadence: 'daily',
        tier: 1,
        timeoutMin: 5,
      },
      {
        id: 'c',
        script: 's:daily-t0',
        context: 'c-c',
        cadence: 'daily',
        tier: 0,
        timeoutMin: 5,
      },
    ]
    expect(buildSeedOrder(fake)).toEqual([
      's:daily-t0',
      's:daily-t1',
      's:weekly',
      ...AGGREGATE_STEPS,
    ])
  })
})

describe('cron weekly · pós-processamento de agregados', () => {
  // Guard anti-drift simétrico ao seed-local: as agregadas (AGGREGATE_STEPS)
  // não vivem no registry (não são ingestão), então o cron de prod não as pega
  // pela matrix. O job dedicado `aggregates` do ingestion-weekly.yml roda essa
  // cauda — e ESTE teste garante que ela roda TODOS os AGGREGATE_STEPS. Sem
  // isso, adicionar um agregado novo à cauda não o agendaria em produção (as
  // agregadas ficariam stale, como antes deste fix).
  const yml = readFileSync(
    resolve(process.cwd(), '.github/workflows/ingestion-weekly.yml'),
    'utf-8',
  )
  for (const step of AGGREGATE_STEPS) {
    it(`o workflow weekly roda ${step}`, () => {
      expect(yml).toContain(`script: ${step}`)
    })
  }
})
