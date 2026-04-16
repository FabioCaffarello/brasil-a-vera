import { Entity } from '@/core/shared/domain/entity'
import type { ValueObject } from '@/core/shared/domain/value-object'
import type { TipoVoto } from './value-objects/tipo-voto.vo'
import { VotoNominalId } from './value-objects/voto-nominal-id.vo'

export type VotoNominalConstructorProps = {
  votoNominalId?: VotoNominalId
  parlamentarIdExterno: string
  tipoVoto: TipoVoto
  dataHora: Date | null
}

export class VotoNominal extends Entity {
  readonly votoNominalId: VotoNominalId
  readonly parlamentarIdExterno: string
  readonly tipoVoto: TipoVoto
  readonly dataHora: Date | null

  constructor(props: VotoNominalConstructorProps) {
    super()
    this.votoNominalId = props.votoNominalId ?? new VotoNominalId()
    this.parlamentarIdExterno = props.parlamentarIdExterno
    this.tipoVoto = props.tipoVoto
    this.dataHora = props.dataHora
  }

  get entityId(): ValueObject {
    return this.votoNominalId
  }

  toJSON(): Record<string, unknown> {
    return {
      votoNominalId: this.votoNominalId.id,
      parlamentarIdExterno: this.parlamentarIdExterno,
      tipoVoto: this.tipoVoto,
      dataHora: this.dataHora,
    }
  }
}
