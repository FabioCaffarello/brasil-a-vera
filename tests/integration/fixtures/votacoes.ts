import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type { votacao, votoNominal } from '@/modules/votacoes/domain/schema'

export type VotacaoInsert = InferInsertModel<typeof votacao>
export type VotoNominalInsert = InferInsertModel<typeof votoNominal>

export function buildVotacao(
  overrides: Partial<VotacaoInsert> = {},
): VotacaoInsert {
  const id = uuidv7()
  return {
    id,
    sourceId: `vot-${id.slice(-12)}`,
    casa: 'CAMARA',
    dataHora: new Date('2026-04-10T14:00:00Z'),
    descricao: 'Votação simbólica do projeto',
    orgao: 'PLENARIO',
    votosSim: 250,
    votosNao: 200,
    abstencoes: 5,
    aprovada: true,
    trustLevel: 'L2',
    sourceUrl: `https://example.test/votacao/${id}`,
    ...overrides,
  }
}

export function buildVotoNominal(
  args: {
    votacaoId: string
    parlamentarId: string
  } & Partial<VotoNominalInsert>,
): VotoNominalInsert {
  const id = uuidv7()
  return {
    id,
    voto: 'SIM',
    ...args,
  }
}
