import { ValueObject } from '@/core/shared/domain/value-object'
import type { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import type { Partido } from './value-objects/partido.vo'

export class FiliacaoPartidaria extends ValueObject {
  readonly partido: Partido
  readonly periodo: DateRange

  constructor(partido: Partido, periodo: DateRange) {
    super()
    this.partido = partido
    this.periodo = periodo
  }

  isActive(referenceDate: Date = new Date()): boolean {
    return this.periodo.isActive(referenceDate)
  }
}
