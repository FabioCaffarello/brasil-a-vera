import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type { parlamentar } from '@/modules/parlamentares/domain/schema'

export type ParlamentarInsert = InferInsertModel<typeof parlamentar>

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
