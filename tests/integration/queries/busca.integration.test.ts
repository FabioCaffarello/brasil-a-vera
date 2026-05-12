import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db', () => import('../setup/db'))

import { busca } from '@/lib/queries/busca'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicao } from '@/modules/proposicoes/domain/schema'
import { votacao } from '@/modules/votacoes/domain/schema'
import { buildParlamentar } from '../fixtures/parlamentares'
import { buildProposicao } from '../fixtures/proposicoes'
import { buildVotacao } from '../fixtures/votacoes'
import { db } from '../setup/db'
import { truncateAll } from '../setup/truncate'

describe('queries/busca (integration)', () => {
  beforeEach(async () => {
    await truncateAll()
  })

  it('retorna seções vazias e proposicaoMatchExato null para query < 2 chars', async () => {
    const result = await busca('a')
    expect(result).toEqual({
      parlamentares: [],
      proposicoes: [],
      votacoes: [],
      proposicaoMatchExato: null,
    })
  })

  it('encontra parlamentar por nome via ILIKE', async () => {
    await db
      .insert(parlamentar)
      .values([
        buildParlamentar({ nome: 'Aurora Silva' }),
        buildParlamentar({ nome: 'Bruno Costa' }),
      ])

    const result = await busca('aurora')
    expect(result.parlamentares).toHaveLength(1)
    expect(result.parlamentares[0]?.nome).toBe('Aurora Silva')
    expect(result.proposicoes).toEqual([])
    expect(result.votacoes).toEqual([])
  })

  it('encontra proposição por ementa via ILIKE', async () => {
    await db.insert(proposicao).values([
      buildProposicao({
        numero: 1,
        ano: 2026,
        ementa: 'Dispõe sobre saúde pública',
      }),
      buildProposicao({
        numero: 2,
        ano: 2026,
        ementa: 'Educação básica',
      }),
    ])

    const result = await busca('saúde')
    expect(result.proposicoes).toHaveLength(1)
    expect(result.proposicoes[0]?.ementa).toContain('saúde')
  })

  it('encontra votação por descricao via ILIKE', async () => {
    await db
      .insert(votacao)
      .values([
        buildVotacao({ descricao: 'Reforma tributária - destaque 5' }),
        buildVotacao({ descricao: 'Outra votação qualquer' }),
      ])

    const result = await busca('tributária')
    expect(result.votacoes).toHaveLength(1)
    expect(result.votacoes[0]?.descricao).toContain('tributária')
  })

  it('extrai proposicaoMatchExato no formato canônico "PL N/AAAA"', async () => {
    const result = await busca('PL 1234/2026')
    expect(result.proposicaoMatchExato).toEqual({
      tipo: 'PL',
      numero: 1234,
      ano: 2026,
    })
  })
})
