import type { Gasto } from '../../../domain/gasto.aggregate'

export type GastoOutput = {
  gastoId: string
  parlamentarIdExterno: string
  ano: number
  mes: number
  tipoDespesa: string
  codDocumento: number
  tipoDocumento: string
  dataDocumento: Date | null
  numDocumento: string
  valorDocumento: number
  urlDocumento: string
  nomeFornecedor: string
  cnpjCpfFornecedor: string
  valorLiquido: number
  valorGlosa: number
  trustLevel: string
  sourceUrl: string | undefined
  createdAt: Date
  updatedAt: Date
}

export function toGastoOutput(entity: Gasto): GastoOutput {
  return {
    gastoId: entity.gastoId.id,
    parlamentarIdExterno: entity.parlamentarIdExterno,
    ano: entity.ano,
    mes: entity.mes,
    tipoDespesa: entity.tipoDespesa,
    codDocumento: entity.codDocumento,
    tipoDocumento: entity.tipoDocumento,
    dataDocumento: entity.dataDocumento,
    numDocumento: entity.numDocumento,
    valorDocumento: entity.valorDocumento,
    urlDocumento: entity.urlDocumento,
    nomeFornecedor: entity.nomeFornecedor,
    cnpjCpfFornecedor: entity.cnpjCpfFornecedor,
    valorLiquido: entity.valorLiquido,
    valorGlosa: entity.valorGlosa,
    trustLevel: entity.trust.trustLevel,
    sourceUrl: entity.trust.sourceUrl,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
