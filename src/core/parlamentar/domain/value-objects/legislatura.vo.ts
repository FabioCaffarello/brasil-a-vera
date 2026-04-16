import { ValueObject } from '@/core/shared/domain/value-object'
import type { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'

export class Legislatura extends ValueObject {
  readonly numero: number
  readonly periodo: DateRange

  constructor(numero: number, periodo: DateRange) {
    super()
    this.numero = numero
    this.periodo = periodo
  }

  toString(): string {
    return `${this.numero}ª Legislatura`
  }
}
