import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type {
  membroComissao,
  parlamentar,
} from '@/modules/parlamentares/domain/schema'

export type ParlamentarInsert = InferInsertModel<typeof parlamentar>
export type MembroComissaoInsert = InferInsertModel<typeof membroComissao>

export function buildParlamentar(
  overrides: Partial<ParlamentarInsert> = {},
): ParlamentarInsert {
  const id = uuidv7()
  return {
    id,
    sourceId: `src-${id.slice(-12)}`,
    nome: 'Maria Souza',
    casa: 'CAMARA',
    partidoSigla: 'PT',
    partidoNome: 'Partido dos Trabalhadores',
    uf: 'SP',
    situacaoMandato: 'EXERCICIO',
    legislatura: 57,
    trustLevel: 'L2',
    sourceUrl: `https://example.test/parlamentar/${id}`,
    ...overrides,
  }
}

export function buildMembroComissao(
  overrides: Partial<MembroComissaoInsert> = {},
): MembroComissaoInsert {
  const id = uuidv7()
  return {
    id,
    parlamentarId: uuidv7(),
    comissaoSourceId: `org-${id.slice(-12)}`,
    comissaoNome: 'Comissão de Constituição e Justiça e de Cidadania',
    comissaoSigla: 'CCJC',
    cargoOrigem: 'Titular',
    tipoParticipacao: 'TITULAR',
    dataInicio: '2024-03-01',
    dataFim: null,
    ...overrides,
  }
}
