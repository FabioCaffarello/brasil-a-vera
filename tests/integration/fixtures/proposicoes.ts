import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type {
  proposicao,
  proposicaoAutor,
} from '@/modules/proposicoes/domain/schema'

export type ProposicaoInsert = InferInsertModel<typeof proposicao>
export type ProposicaoAutorInsert = InferInsertModel<typeof proposicaoAutor>

export function buildProposicao(
  overrides: Partial<ProposicaoInsert> = {},
): ProposicaoInsert {
  const id = uuidv7()
  return {
    id,
    sourceId: `prop-${id.slice(-12)}`,
    tipo: 'PL',
    numero: 1234,
    ano: 2026,
    ementa: 'Dispõe sobre o assunto X.',
    situacao: 'TRAMITANDO',
    trustLevel: 'L2',
    sourceUrl: `https://example.test/proposicao/${id}`,
    ...overrides,
  }
}

export function buildProposicaoAutor(
  args: {
    proposicaoId: string
    parlamentarId: string
    nome: string
  } & Partial<ProposicaoAutorInsert>,
): ProposicaoAutorInsert {
  const id = uuidv7()
  return {
    id,
    tipoAutoria: 'AUTOR',
    ...args,
  }
}
