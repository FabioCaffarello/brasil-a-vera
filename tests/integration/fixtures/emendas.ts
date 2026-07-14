import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type { emendaParlamentar } from '@/modules/orcamento/domain/schema'

export type EmendaInsert = InferInsertModel<typeof emendaParlamentar>

export function buildEmenda(
  args: { parlamentarId: string } & Partial<EmendaInsert>,
): EmendaInsert {
  const id = uuidv7()
  return {
    id,
    codigoEmenda: `2026${id.slice(-8)}`,
    ano: 2026,
    tipoEmenda: 'Emenda Individual - Transferências com Finalidade Definida',
    autorCodigo: '3819',
    autorNome: 'MARIA SOUZA',
    localidade: 'BELO HORIZONTE - MG',
    municipioIbgeCodigo: '3106200',
    municipioNome: 'BELO HORIZONTE',
    uf: 'MG',
    valorEmpenhado: '100000.00',
    valorLiquidado: '50000.00',
    valorPago: '50000.00',
    valorRapInscritos: '0.00',
    valorRapPagos: '0.00',
    trustLevel: 'L1',
    sourceUrl:
      'https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO',
    ...args,
  }
}
