import { ValueObject } from '@/core/shared/domain/value-object'
import type { TipoParticipacao } from './value-objects/tipo-participacao.vo'

export class FrenteParlamentar extends ValueObject {
  readonly frenteId: string
  readonly titulo: string
  readonly tipo: TipoParticipacao

  constructor(frenteId: string, titulo: string, tipo: TipoParticipacao) {
    super()
    this.frenteId = frenteId
    this.titulo = titulo
    this.tipo = tipo
  }
}
