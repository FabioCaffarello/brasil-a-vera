import { AggregateRoot } from '@/core/shared/domain/aggregate-root'
import type { ValueObject } from '@/core/shared/domain/value-object'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { validateGasto } from './gasto.validator'
import { GastoId } from './value-objects/gasto-id.vo'

export type GastoConstructorProps = {
  gastoId?: GastoId
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
  trust: TrustMetadata
  createdAt?: Date
  updatedAt?: Date
}

export type GastoCreateCommand = {
  parlamentarIdExterno: string
  ano: number
  mes: number
  tipoDespesa: string
  codDocumento: number
  tipoDocumento: string
  dataDocumento: string | null
  numDocumento: string
  valorDocumento: number
  urlDocumento: string
  nomeFornecedor: string
  cnpjCpfFornecedor: string
  valorLiquido: number
  valorGlosa: number
  sourceUrl: string
}

export class Gasto extends AggregateRoot {
  gastoId: GastoId
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
  trust: TrustMetadata
  createdAt: Date
  updatedAt: Date

  constructor(props: GastoConstructorProps) {
    super()
    this.gastoId = props.gastoId ?? new GastoId()
    this.parlamentarIdExterno = props.parlamentarIdExterno
    this.ano = props.ano
    this.mes = props.mes
    this.tipoDespesa = props.tipoDespesa
    this.codDocumento = props.codDocumento
    this.tipoDocumento = props.tipoDocumento
    this.dataDocumento = props.dataDocumento
    this.numDocumento = props.numDocumento
    this.valorDocumento = props.valorDocumento
    this.urlDocumento = props.urlDocumento
    this.nomeFornecedor = props.nomeFornecedor
    this.cnpjCpfFornecedor = props.cnpjCpfFornecedor
    this.valorLiquido = props.valorLiquido
    this.valorGlosa = props.valorGlosa
    this.trust = props.trust
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  get entityId(): ValueObject {
    return this.gastoId
  }

  static create(command: GastoCreateCommand): Gasto {
    const gasto = new Gasto({
      parlamentarIdExterno: command.parlamentarIdExterno,
      ano: command.ano,
      mes: command.mes,
      tipoDespesa: command.tipoDespesa,
      codDocumento: command.codDocumento,
      tipoDocumento: command.tipoDocumento,
      dataDocumento: command.dataDocumento
        ? new Date(command.dataDocumento)
        : null,
      numDocumento: command.numDocumento,
      valorDocumento: command.valorDocumento,
      urlDocumento: command.urlDocumento,
      nomeFornecedor: command.nomeFornecedor,
      cnpjCpfFornecedor: command.cnpjCpfFornecedor,
      valorLiquido: command.valorLiquido,
      valorGlosa: command.valorGlosa,
      trust: TrustMetadata.official(command.sourceUrl),
    })
    gasto.validate()
    return gasto
  }

  validate(): boolean {
    return validateGasto(this.notification, {
      parlamentarIdExterno: this.parlamentarIdExterno,
      tipoDespesa: this.tipoDespesa,
      ano: this.ano,
      mes: this.mes,
    })
  }

  toJSON(): Record<string, unknown> {
    return {
      gastoId: this.gastoId.id,
      parlamentarIdExterno: this.parlamentarIdExterno,
      ano: this.ano,
      mes: this.mes,
      tipoDespesa: this.tipoDespesa,
      codDocumento: this.codDocumento,
      tipoDocumento: this.tipoDocumento,
      dataDocumento: this.dataDocumento,
      numDocumento: this.numDocumento,
      valorDocumento: this.valorDocumento,
      urlDocumento: this.urlDocumento,
      nomeFornecedor: this.nomeFornecedor,
      cnpjCpfFornecedor: this.cnpjCpfFornecedor,
      valorLiquido: this.valorLiquido,
      valorGlosa: this.valorGlosa,
      trustLevel: this.trust.trustLevel,
      sourceUrl: this.trust.sourceUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
