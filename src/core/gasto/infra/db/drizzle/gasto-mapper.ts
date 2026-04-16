import type { TrustLevel } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { Gasto } from '../../../domain/gasto.aggregate'
import { GastoId } from '../../../domain/value-objects/gasto-id.vo'
import type { gastos } from './gasto.schema'

export type GastoRow = typeof gastos.$inferSelect

export function gastoToPersistence(entity: Gasto) {
  return {
    id: entity.gastoId.id,
    parlamentarIdExterno: entity.parlamentarIdExterno,
    ano: entity.ano,
    mes: entity.mes,
    tipoDespesa: entity.tipoDespesa,
    codDocumento: entity.codDocumento,
    tipoDocumento: entity.tipoDocumento,
    dataDocumento: entity.dataDocumento
      ? entity.dataDocumento.toISOString().split('T')[0]
      : null,
    numDocumento: entity.numDocumento,
    valorDocumento: entity.valorDocumento,
    urlDocumento: entity.urlDocumento,
    nomeFornecedor: entity.nomeFornecedor,
    cnpjCpfFornecedor: entity.cnpjCpfFornecedor,
    valorLiquido: entity.valorLiquido,
    valorGlosa: entity.valorGlosa,
    trustLevel: entity.trust.trustLevel,
    sourceUrl: entity.trust.sourceUrl ?? '',
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

export function gastoToDomain(row: GastoRow): Gasto {
  return new Gasto({
    gastoId: new GastoId(row.id),
    parlamentarIdExterno: row.parlamentarIdExterno,
    ano: row.ano,
    mes: row.mes,
    tipoDespesa: row.tipoDespesa,
    codDocumento: row.codDocumento,
    tipoDocumento: row.tipoDocumento,
    dataDocumento: row.dataDocumento ? new Date(row.dataDocumento) : null,
    numDocumento: row.numDocumento,
    valorDocumento: row.valorDocumento,
    urlDocumento: row.urlDocumento,
    nomeFornecedor: row.nomeFornecedor,
    cnpjCpfFornecedor: row.cnpjCpfFornecedor,
    valorLiquido: row.valorLiquido,
    valorGlosa: row.valorGlosa,
    trust: new TrustMetadata(row.trustLevel as TrustLevel, row.sourceUrl),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}
