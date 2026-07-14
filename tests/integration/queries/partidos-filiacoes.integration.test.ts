import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { getFiliacoesRecentes } from '@/lib/queries/partidos'
import {
  filiacaoPartidaria,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'
import { buildFiliacao, buildParlamentar } from '../fixtures/parlamentares'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

// Regressão do #660: `NOW() - INTERVAL '365 days'::date` — o ::date liga no
// literal INTERVAL (precedência) e o Postgres rejeita com "cannot cast type
// interval to date", derrubando /partidos/[sigla] com 500 em prod. Este teste
// exercita o SQL real da query contra Postgres (testcontainers) — com o cast
// errado ele falha na execução, não só no resultado.

function isoDate(diasAtras: number): string {
  const d = new Date(Date.now() - diasAtras * 86_400_000)
  return d.toISOString().slice(0, 10)
}

describe('queries/partidos getFiliacoesRecentes (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('executa sem erro de SQL e retorna [] sem filiações', async () => {
    expect(await getFiliacoesRecentes('PT')).toEqual([])
  })

  it('retorna entrada recente e ignora filiação fora da janela de 365 dias', async () => {
    const p = buildParlamentar()
    const antigo = buildParlamentar({ nome: 'Antigo Filiado' })
    await db.insert(parlamentar).values([p, antigo])
    await db.insert(filiacaoPartidaria).values([
      buildFiliacao({
        parlamentarId: p.id as string,
        dataInicio: isoDate(30),
      }),
      buildFiliacao({
        parlamentarId: antigo.id as string,
        dataInicio: isoDate(400),
      }),
    ])

    const movs = await getFiliacoesRecentes('PT')
    const entradas = movs.filter((m) => m.tipo === 'ENTRADA')
    expect(entradas).toHaveLength(1)
    expect(entradas[0].parlamentarId).toBe(p.id)
  })
})
