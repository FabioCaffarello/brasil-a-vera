import { InvalidArgumentError } from '../errors/invalid-argument.error'
import { ValueObject } from '../value-object'

export class DateRange extends ValueObject {
  readonly start: Date
  readonly end: Date | null

  constructor(start: Date, end?: Date | null) {
    super()
    this.start = start
    this.end = end ?? null
    this.validate()
  }

  private validate(): void {
    if (this.end && this.end < this.start) {
      throw new InvalidArgumentError('End date must be after start date')
    }
  }

  isActive(referenceDate: Date = new Date()): boolean {
    if (!this.end) return this.start <= referenceDate
    return this.start <= referenceDate && referenceDate <= this.end
  }

  overlaps(other: DateRange): boolean {
    const thisEnd = this.end ?? new Date(9999, 11, 31)
    const otherEnd = other.end ?? new Date(9999, 11, 31)
    return this.start <= otherEnd && other.start <= thisEnd
  }

  durationInDays(): number | null {
    if (!this.end) return null
    const diffMs = this.end.getTime() - this.start.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }
}
