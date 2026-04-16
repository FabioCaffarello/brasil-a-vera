import { Entity } from '@/core/shared/domain/entity'
import type { ValueObject } from '@/core/shared/domain/value-object'
import type { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import { Uuid } from '@/core/shared/domain/value-objects/uuid.vo'
import type { Legislatura } from './value-objects/legislatura.vo'
import type { SituacaoMandato } from './value-objects/situacao-mandato.vo'

export type MandatoConstructorProps = {
  mandatoId?: Uuid
  legislatura: Legislatura
  periodo: DateRange
  situacao: SituacaoMandato
}

export class Mandato extends Entity {
  readonly mandatoId: Uuid
  readonly legislatura: Legislatura
  readonly periodo: DateRange
  situacao: SituacaoMandato

  constructor(props: MandatoConstructorProps) {
    super()
    this.mandatoId = props.mandatoId ?? new Uuid()
    this.legislatura = props.legislatura
    this.periodo = props.periodo
    this.situacao = props.situacao
  }

  get entityId(): ValueObject {
    return this.mandatoId
  }

  isActive(referenceDate: Date = new Date()): boolean {
    return this.periodo.isActive(referenceDate)
  }

  toJSON(): Record<string, unknown> {
    return {
      mandatoId: this.mandatoId.id,
      legislatura: this.legislatura.numero,
      periodo: {
        start: this.periodo.start,
        end: this.periodo.end,
      },
      situacao: this.situacao,
    }
  }
}
