import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type {
  proposicao,
  proposicaoAutor,
  proposicaoTema,
  relatoria,
  tramitacao,
} from '@/modules/proposicoes/domain/schema'

export type ProposicaoInsert = InferInsertModel<typeof proposicao>
export type ProposicaoAutorInsert = InferInsertModel<typeof proposicaoAutor>
export type ProposicaoTemaInsert = InferInsertModel<typeof proposicaoTema>
export type RelatoriaInsert = InferInsertModel<typeof relatoria>
export type TramitacaoInsert = InferInsertModel<typeof tramitacao>

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

export function buildRelatoria(
  args: { proposicaoId: string } & Partial<RelatoriaInsert>,
): RelatoriaInsert {
  return {
    id: uuidv7(),
    relatorSourceId: '99999',
    ...args,
  }
}

export function buildProposicaoTema(
  args: { proposicaoId: string } & Partial<ProposicaoTemaInsert>,
): ProposicaoTemaInsert {
  return {
    codigoTema: 1,
    nomeTema: 'Tema Genérico',
    ...args,
  }
}

export function buildTramitacao(
  args: { proposicaoId: string } & Partial<TramitacaoInsert>,
): TramitacaoInsert {
  const id = uuidv7()
  return {
    id,
    data: new Date('2026-04-10T10:00:00Z'),
    orgao: 'PLEN',
    descricaoResumida: 'Apresentação de Proposição',
    sourceId: id.slice(-6),
    ...args,
  }
}
