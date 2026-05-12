import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type { gasto } from '@/modules/gastos/domain/schema'

export type GastoInsert = InferInsertModel<typeof gasto>

export function buildGasto(
  args: { parlamentarId: string } & Partial<GastoInsert>,
): GastoInsert {
  const id = uuidv7()
  return {
    id,
    tipo: 'CEAP',
    categoriaCodigo: 1,
    categoriaDescricao: 'PASSAGEM AÉREA',
    fornecedorNome: 'Fornecedor Genérico',
    valor: '100.00',
    dataEmissao: '2026-04-10',
    trustLevel: 'L2',
    sourceUrl: `https://example.test/gasto/${id}`,
    ...args,
  }
}
